import { mkdir, rm, writeFile, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TokenUsage } from "@lilbuddy/shared";
import { EMPTY_TOKEN_USAGE } from "@lilbuddy/shared";

import { type TokenUpdateCallback, TranscriptTailer } from "./transcript-tailer.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let testDir: string;
let testFile: string;
let tailer: TranscriptTailer | undefined;

function makeAssistantRecord(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}): string {
  return JSON.stringify({
    type: "assistant",
    message: { usage },
  });
}

function makeNonAssistantRecord(type: string): string {
  return JSON.stringify({ type });
}

/** Wait for a condition or timeout */
async function waitFor(
  predicate: () => boolean,
  timeoutMs = 3000,
  intervalMs = 50,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitFor timed out");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

beforeEach(async () => {
  testDir = join(tmpdir(), `transcript-tailer-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });
  testFile = join(testDir, "transcript.jsonl");
});

afterEach(async () => {
  if (tailer) {
    await tailer.stop();
    tailer = undefined;
  }
  await rm(testDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TranscriptTailer", () => {
  it("starts with empty accumulated tokens", () => {
    const callback = vi.fn();
    tailer = new TranscriptTailer(testFile, callback);
    expect(tailer.accumulated).toEqual(EMPTY_TOKEN_USAGE);
    expect(tailer.isWatching).toBe(false);
  });

  it("extracts token usage from assistant records", async () => {
    const callback = vi.fn<TokenUpdateCallback>();

    // Write file before starting tailer
    await writeFile(
      testFile,
      makeAssistantRecord({ input_tokens: 100, output_tokens: 50 }) + "\n",
    );

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();
    expect(tailer.isWatching).toBe(true);

    await waitFor(() => callback.mock.calls.length >= 1);

    expect(tailer.accumulated).toEqual({
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      inputTokens: 100,
      outputTokens: 50,
    });
  });

  it("accumulates tokens across multiple assistant records", async () => {
    const callback = vi.fn<TokenUpdateCallback>();

    const lines = [
      makeAssistantRecord({ input_tokens: 100, output_tokens: 50 }),
      makeAssistantRecord({ input_tokens: 200, output_tokens: 75 }),
      makeAssistantRecord({
        input_tokens: 50,
        output_tokens: 25,
        cache_creation_input_tokens: 10,
        cache_read_input_tokens: 5,
      }),
    ].join("\n") + "\n";

    await writeFile(testFile, lines);

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();

    await waitFor(() => callback.mock.calls.length >= 1);

    expect(tailer.accumulated).toEqual({
      cacheCreationInputTokens: 10,
      cacheReadInputTokens: 5,
      inputTokens: 350,
      outputTokens: 150,
    });
  });

  it("ignores non-assistant records", async () => {
    const callback = vi.fn<TokenUpdateCallback>();

    const lines = [
      makeNonAssistantRecord("user"),
      makeNonAssistantRecord("system"),
      makeNonAssistantRecord("tool_result"),
      makeNonAssistantRecord("progress"),
      makeAssistantRecord({ input_tokens: 100, output_tokens: 50 }),
    ].join("\n") + "\n";

    await writeFile(testFile, lines);

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();

    await waitFor(() => callback.mock.calls.length >= 1);

    // Only the single assistant record should contribute
    expect(tailer.accumulated.inputTokens).toBe(100);
    expect(tailer.accumulated.outputTokens).toBe(50);
  });

  it("ignores assistant records without message.usage", async () => {
    const callback = vi.fn<TokenUpdateCallback>();

    const lines = [
      JSON.stringify({ type: "assistant", message: { content: "hello" } }),
      makeAssistantRecord({ input_tokens: 100, output_tokens: 50 }),
    ].join("\n") + "\n";

    await writeFile(testFile, lines);

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();

    await waitFor(() => callback.mock.calls.length >= 1);

    expect(tailer.accumulated.inputTokens).toBe(100);
  });

  it("handles file not yet created (waits for it)", async () => {
    const callback = vi.fn<TokenUpdateCallback>();

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();

    // File doesn't exist yet — tailer should be waiting
    expect(tailer.isWatching).toBe(true);
    expect(callback).not.toHaveBeenCalled();

    // Create the file after a delay
    await new Promise((r) => setTimeout(r, 600));
    await writeFile(
      testFile,
      makeAssistantRecord({ input_tokens: 42, output_tokens: 18 }) + "\n",
    );

    await waitFor(() => callback.mock.calls.length >= 1);

    expect(tailer.accumulated.inputTokens).toBe(42);
    expect(tailer.accumulated.outputTokens).toBe(18);
  });

  it("reads incrementally when file grows", async () => {
    const callback = vi.fn<TokenUpdateCallback>();

    await writeFile(
      testFile,
      makeAssistantRecord({ input_tokens: 100, output_tokens: 50 }) + "\n",
    );

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();

    await waitFor(() => callback.mock.calls.length >= 1);
    expect(tailer.accumulated.inputTokens).toBe(100);

    // Append more data
    await appendFile(
      testFile,
      makeAssistantRecord({ input_tokens: 200, output_tokens: 75 }) + "\n",
    );

    await waitFor(() => tailer!.accumulated.inputTokens === 300, 5000);

    expect(tailer.accumulated).toEqual({
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      inputTokens: 300,
      outputTokens: 125,
    });
  });

  it("handles partial lines across reads", async () => {
    const callback = vi.fn<TokenUpdateCallback>();

    // Write a complete line + start of another (no trailing newline)
    const fullLine = makeAssistantRecord({ input_tokens: 100, output_tokens: 50 });
    const partialLine = makeAssistantRecord({ input_tokens: 200, output_tokens: 75 });

    await writeFile(testFile, fullLine + "\n" + partialLine);

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();

    await waitFor(() => callback.mock.calls.length >= 1);

    // Only the complete line should be processed
    expect(tailer.accumulated.inputTokens).toBe(100);

    // Complete the partial line
    await appendFile(testFile, "\n");

    await waitFor(() => tailer!.accumulated.inputTokens === 300, 5000);

    expect(tailer.accumulated.inputTokens).toBe(300);
  });

  it("ignores invalid JSON lines", async () => {
    const callback = vi.fn<TokenUpdateCallback>();

    const lines = [
      "not valid json",
      "{broken: json}",
      makeAssistantRecord({ input_tokens: 100, output_tokens: 50 }),
    ].join("\n") + "\n";

    await writeFile(testFile, lines);

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();

    await waitFor(() => callback.mock.calls.length >= 1);

    expect(tailer.accumulated.inputTokens).toBe(100);
  });

  it("stops watching and cleans up on stop()", async () => {
    const callback = vi.fn<TokenUpdateCallback>();

    await writeFile(
      testFile,
      makeAssistantRecord({ input_tokens: 100, output_tokens: 50 }) + "\n",
    );

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();

    await waitFor(() => callback.mock.calls.length >= 1);

    await tailer.stop();
    expect(tailer.isWatching).toBe(false);

    // Append after stop — should not trigger callback
    const callCountBefore = callback.mock.calls.length;
    await appendFile(
      testFile,
      makeAssistantRecord({ input_tokens: 999, output_tokens: 999 }) + "\n",
    );

    await new Promise((r) => setTimeout(r, 700));
    expect(callback.mock.calls.length).toBe(callCountBefore);
  });

  it("stop() is safe to call when file never existed", async () => {
    const callback = vi.fn();
    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();

    // Stop before file is created
    await tailer.stop();
    expect(tailer.isWatching).toBe(false);
  });

  it("start() is idempotent", async () => {
    const callback = vi.fn();

    await writeFile(
      testFile,
      makeAssistantRecord({ input_tokens: 100, output_tokens: 50 }) + "\n",
    );

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();
    tailer.start(); // second call should be no-op

    await waitFor(() => callback.mock.calls.length >= 1);
    expect(tailer.accumulated.inputTokens).toBe(100);
  });

  it("handles empty file gracefully", async () => {
    const callback = vi.fn();

    await writeFile(testFile, "");

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();

    await new Promise((r) => setTimeout(r, 700));
    expect(callback).not.toHaveBeenCalled();
    expect(tailer.accumulated).toEqual(EMPTY_TOKEN_USAGE);
  });

  it("processes batch of records arriving between polls", async () => {
    const callback = vi.fn<TokenUpdateCallback>();

    await writeFile(testFile, "");

    tailer = new TranscriptTailer(testFile, callback);
    tailer.start();

    // Write a batch of records at once
    const batch = Array.from({ length: 10 }, (_, i) =>
      makeAssistantRecord({ input_tokens: 10 * (i + 1), output_tokens: 5 * (i + 1) }),
    ).join("\n") + "\n";

    await appendFile(testFile, batch);

    // Total: input = 10+20+...+100 = 550, output = 5+10+...+50 = 275
    await waitFor(() => tailer!.accumulated.inputTokens === 550, 5000);

    expect(tailer.accumulated.outputTokens).toBe(275);
  });
});
