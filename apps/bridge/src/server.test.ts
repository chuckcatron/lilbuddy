import { describe, expect, it, vi } from "vitest";

import type { HookPayload, SessionStartPayload } from "@lilbuddy/shared";

import { BridgeServer } from "./server.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSessionStart(): SessionStartPayload {
  return {
    cwd: "/test/cwd",
    hook_event_name: "SessionStart",
    model: "claude-opus-4-6[1m]",
    session_id: "test-session-1",
    source: "startup",
    transcript_path: "/test/transcript.jsonl",
  };
}

async function postToServer(
  port: number,
  body: string,
  options: { method?: string; path?: string } = {},
): Promise<{ status: number; body: string }> {
  const res = await fetch(
    `http://127.0.0.1:${port}${options.path ?? "/"}`,
    {
      body: options.method === "GET" ? undefined : body,
      method: options.method ?? "POST",
      headers: { "Content-Type": "application/json" },
    },
  );
  const text = await res.text();
  return { status: res.status, body: text };
}

// Use a different port for each test to avoid conflicts
let nextPort = 19_100;
function getPort(): number {
  return nextPort++;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BridgeServer", () => {
  it("calls onEvent with parsed HookPayload on valid POST", async () => {
    const onEvent = vi.fn();
    const port = getPort();
    const server = new BridgeServer({ onEvent, port });

    await server.start();
    try {
      const event = makeSessionStart();
      const res = await postToServer(port, JSON.stringify(event));

      expect(res.status).toBe(204);
      expect(onEvent).toHaveBeenCalledTimes(1);
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          hook_event_name: "SessionStart",
          session_id: "test-session-1",
        }),
      );
    } finally {
      await server.stop();
    }
  });

  it("returns 204 but does not call onEvent for invalid JSON", async () => {
    const onEvent = vi.fn();
    const port = getPort();
    const server = new BridgeServer({ onEvent, port });

    await server.start();
    try {
      const res = await postToServer(port, "not valid json {{{");

      expect(res.status).toBe(204);
      expect(onEvent).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it("returns 204 but does not call onEvent for JSON without hook_event_name", async () => {
    const onEvent = vi.fn();
    const port = getPort();
    const server = new BridgeServer({ onEvent, port });

    await server.start();
    try {
      const res = await postToServer(port, JSON.stringify({ some: "data" }));

      expect(res.status).toBe(204);
      expect(onEvent).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it("returns 204 but does not call onEvent for payload missing required fields", async () => {
    const onEvent = vi.fn();
    const port = getPort();
    const server = new BridgeServer({ onEvent, port });

    await server.start();
    try {
      // Has hook_event_name but missing session_id, cwd, transcript_path
      const res = await postToServer(
        port,
        JSON.stringify({ hook_event_name: "SessionStart" }),
      );

      expect(res.status).toBe(204);
      expect(onEvent).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it("returns 405 for non-POST methods", async () => {
    const onEvent = vi.fn();
    const port = getPort();
    const server = new BridgeServer({ onEvent, port });

    await server.start();
    try {
      const res = await postToServer(port, "", { method: "GET" });

      expect(res.status).toBe(405);
      expect(onEvent).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it("binds to 127.0.0.1 by default", async () => {
    const onEvent = vi.fn();
    const port = getPort();
    const server = new BridgeServer({ onEvent, port });

    await server.start();
    try {
      // If bound to 127.0.0.1, fetch to 127.0.0.1 should work
      const res = await postToServer(port, JSON.stringify(makeSessionStart()));
      expect(res.status).toBe(204);
    } finally {
      await server.stop();
    }
  });

  it("exposes port via getter", () => {
    const server = new BridgeServer({ onEvent: vi.fn(), port: 9999 });
    expect(server.port).toBe(9999);
  });

  it("uses default port 8787 when not specified", () => {
    const server = new BridgeServer({ onEvent: vi.fn() });
    expect(server.port).toBe(8787);
  });

  it("handles handler errors without crashing", async () => {
    const onEvent = vi.fn().mockImplementation(() => {
      throw new Error("handler boom");
    });
    const port = getPort();
    const server = new BridgeServer({ onEvent, port });

    // Suppress expected error log
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await server.start();
    try {
      // The error is caught in the .catch() handler — server stays up
      const res = await postToServer(port, JSON.stringify(makeSessionStart()));
      // The error happens after writeHead(204) is already called in #handle,
      // but onEvent throws synchronously before the response is sent...
      // Actually, onEvent is called before writeHead, so the catch handler sends 500
      expect(res.status).toBe(500);
    } finally {
      await server.stop();
      consoleSpy.mockRestore();
    }
  });

  it("processes multiple events sequentially", async () => {
    const events: HookPayload[] = [];
    const onEvent = vi.fn((event: HookPayload) => {
      events.push(event);
    });
    const port = getPort();
    const server = new BridgeServer({ onEvent, port });

    await server.start();
    try {
      await postToServer(port, JSON.stringify(makeSessionStart()));
      await postToServer(
        port,
        JSON.stringify({
          ...makeSessionStart(),
          hook_event_name: "SessionEnd",
          session_id: "test-session-1",
        }),
      );

      expect(onEvent).toHaveBeenCalledTimes(2);
      expect(events[0]!.hook_event_name).toBe("SessionStart");
      expect(events[1]!.hook_event_name).toBe("SessionEnd");
    } finally {
      await server.stop();
    }
  });
});
