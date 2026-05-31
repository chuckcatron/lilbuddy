import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionStartPayload } from "@lilbuddy/shared";
import { EMPTY_TOKEN_USAGE } from "@lilbuddy/shared";

import { Forwarder, type ForwarderOptions } from "./forwarder.js";
import { SessionStore } from "./session-store.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_FIELDS = {
  cwd: "/test/cwd",
  session_id: "test-session-1",
  transcript_path: "/test/transcript.jsonl",
} as const;

function makeSessionStart(overrides: Partial<SessionStartPayload> = {}): SessionStartPayload {
  return {
    ...BASE_FIELDS,
    hook_event_name: "SessionStart",
    model: "claude-opus-4-6[1m]",
    source: "startup",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let store: SessionStore;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  store = new SessionStore();

  fetchSpy = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function createForwarder(overrides: Partial<ForwarderOptions> = {}): Forwarder {
  return new Forwarder({
    apiKey: "test-api-key",
    convexUrl: "https://test.convex.cloud",
    store,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Forwarder", () => {
  describe("debouncing", () => {
    it("debounces state changes and sends only the latest state", async () => {
      const forwarder = createForwarder({ debounceMs: 100 });
      forwarder.start();

      // Fire two rapid events for the same session
      store.apply(makeSessionStart());
      store.apply({
        ...BASE_FIELDS,
        hook_event_name: "UserPromptSubmit",
        permission_mode: "default",
        prompt: "hello",
      });

      // Before debounce fires, no fetch
      expect(fetchSpy).not.toHaveBeenCalled();

      // Advance past debounce
      await vi.advanceTimersByTimeAsync(150);

      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Verify the body contains the latest state (after UserPromptSubmit)
      const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
      expect(body.permissionMode).toBe("default");

      forwarder.stop();
    });

    it("debounces independently per session", async () => {
      const forwarder = createForwarder({ debounceMs: 100 });
      forwarder.start();

      store.apply(makeSessionStart({ session_id: "session-a" }));
      store.apply(makeSessionStart({ session_id: "session-b" }));

      await vi.advanceTimersByTimeAsync(150);

      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const sessionIds = fetchSpy.mock.calls.map(
        (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string).sessionId,
      );
      expect(sessionIds).toContain("session-a");
      expect(sessionIds).toContain("session-b");

      forwarder.stop();
    });
  });

  describe("HTTP POST", () => {
    it("sends correct Authorization header", async () => {
      const forwarder = createForwarder({ apiKey: "my-secret-key", debounceMs: 0 });
      forwarder.start();

      store.apply(makeSessionStart());
      await vi.advanceTimersByTimeAsync(10);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const headers = fetchSpy.mock.calls[0]![1]!.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer my-secret-key");

      forwarder.stop();
    });

    it("POSTs to the correct URL", async () => {
      const forwarder = createForwarder({
        convexUrl: "https://my-app.convex.cloud",
        debounceMs: 0,
      });
      forwarder.start();

      store.apply(makeSessionStart());
      await vi.advanceTimersByTimeAsync(10);

      expect(fetchSpy.mock.calls[0]![0]).toBe(
        "https://my-app.convex.cloud/api/bridge/update",
      );

      forwarder.stop();
    });
  });

  describe("SessionState to BridgeUpdateBody transform", () => {
    it("flattens tokens from nested object to top-level fields", async () => {
      const forwarder = createForwarder({ debounceMs: 0 });
      forwarder.start();

      store.apply(makeSessionStart());
      store.updateTokens("test-session-1", {
        cacheCreationInputTokens: 100,
        cacheReadInputTokens: 200,
        inputTokens: 500,
        outputTokens: 300,
      });

      await vi.advanceTimersByTimeAsync(10);

      // Get the last call (token update triggers another forward)
      const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1]!;
      const body = JSON.parse(lastCall[1]!.body as string);

      expect(body.inputTokens).toBe(500);
      expect(body.outputTokens).toBe(300);
      expect(body.cacheCreationInputTokens).toBe(100);
      expect(body.cacheReadInputTokens).toBe(200);
      expect(body.tokens).toBeUndefined(); // should NOT send nested object
    });

    it("flattens notificationState 'none' to string without message", async () => {
      const forwarder = createForwarder({ debounceMs: 0 });
      forwarder.start();

      store.apply(makeSessionStart());
      await vi.advanceTimersByTimeAsync(10);

      const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
      expect(body.notificationState).toBe("none");
      expect(body.notificationMessage).toBeUndefined();

      forwarder.stop();
    });

    it("flattens notificationState with type and message", async () => {
      const forwarder = createForwarder({ debounceMs: 0 });
      forwarder.start();

      store.apply(makeSessionStart());
      store.apply({
        ...BASE_FIELDS,
        hook_event_name: "Notification",
        notification_type: "permission_prompt",
        message: "Allow Write?",
      });

      await vi.advanceTimersByTimeAsync(10);

      const lastCall = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1]!;
      const body = JSON.parse(lastCall[1]!.body as string);
      expect(body.notificationState).toBe("permission_prompt");
      expect(body.notificationMessage).toBe("Allow Write?");

      forwarder.stop();
    });

    it("includes userId from options", async () => {
      const forwarder = createForwarder({ debounceMs: 0, userId: "user-42" });
      forwarder.start();

      store.apply(makeSessionStart());
      await vi.advanceTimersByTimeAsync(10);

      const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
      expect(body.userId).toBe("user-42");

      forwarder.stop();
    });

    it("defaults userId to empty string", async () => {
      const forwarder = createForwarder({ debounceMs: 0 });
      forwarder.start();

      store.apply(makeSessionStart());
      await vi.advanceTimersByTimeAsync(10);

      const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
      expect(body.userId).toBe("");

      forwarder.stop();
    });

    it("excludes currentToolUseId and transcriptPath", async () => {
      const forwarder = createForwarder({ debounceMs: 0 });
      forwarder.start();

      store.apply(makeSessionStart());
      await vi.advanceTimersByTimeAsync(10);

      const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
      expect(body.currentToolUseId).toBeUndefined();
      expect(body.transcriptPath).toBeUndefined();

      forwarder.stop();
    });
  });

  describe("retry with exponential backoff", () => {
    it("retries on fetch failure with exponential delays", async () => {
      fetchSpy
        .mockRejectedValueOnce(new Error("network error"))
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const forwarder = createForwarder({ debounceMs: 0, maxRetries: 3 });
      forwarder.start();

      store.apply(makeSessionStart());

      // Debounce fires
      await vi.advanceTimersByTimeAsync(10);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // first attempt

      // Wait for first retry delay (1s)
      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchSpy).toHaveBeenCalledTimes(2); // second attempt

      // Wait for second retry delay (2s)
      await vi.advanceTimersByTimeAsync(2000);
      expect(fetchSpy).toHaveBeenCalledTimes(3); // third attempt succeeds

      forwarder.stop();
      consoleSpy.mockRestore();
    });

    it("retries on non-ok HTTP status", async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response("error", { status: 500 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const forwarder = createForwarder({ debounceMs: 0, maxRetries: 3 });
      forwarder.start();

      store.apply(makeSessionStart());
      await vi.advanceTimersByTimeAsync(10);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      forwarder.stop();
      consoleSpy.mockRestore();
    });

    it("does not retry on non-retryable 4xx errors", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response("Bad Request", { status: 400 }),
      );

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const forwarder = createForwarder({ debounceMs: 0, maxRetries: 3 });
      forwarder.start();

      store.apply(makeSessionStart());
      await vi.advanceTimersByTimeAsync(10);

      // Should only attempt once — 400 is non-retryable
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("non-retryable 400"),
      );

      forwarder.stop();
      consoleSpy.mockRestore();
    });

    it("gives up after max retries and logs error", async () => {
      fetchSpy.mockRejectedValue(new Error("persistent failure"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const forwarder = createForwarder({ debounceMs: 0, maxRetries: 2 });
      forwarder.start();

      store.apply(makeSessionStart());

      // Debounce + attempt 1
      await vi.advanceTimersByTimeAsync(10);
      // Retry 1 (1s delay)
      await vi.advanceTimersByTimeAsync(1000);
      // Retry 2 (2s delay)
      await vi.advanceTimersByTimeAsync(2000);

      expect(fetchSpy).toHaveBeenCalledTimes(3); // 1 initial + 2 retries

      // Check for "giving up" log
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("giving up on session test-session-1"),
      );

      forwarder.stop();
      consoleSpy.mockRestore();
    });
  });

  describe("lifecycle", () => {
    it("stops listening when stop() is called", async () => {
      const forwarder = createForwarder({ debounceMs: 0 });
      forwarder.start();
      forwarder.stop();

      store.apply(makeSessionStart());
      await vi.advanceTimersByTimeAsync(10);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("clears pending timers on stop()", async () => {
      const forwarder = createForwarder({ debounceMs: 1000 });
      forwarder.start();

      store.apply(makeSessionStart());
      // Timer is pending but hasn't fired yet
      forwarder.stop();

      // Advance past the debounce — should not fire
      await vi.advanceTimersByTimeAsync(2000);

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
