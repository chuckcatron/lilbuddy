import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeFunctionReference } from "convex/server";

import schema from "./schema.js";

// Convex-test requires lazy module imports including _generated for root detection
const modules: Record<string, () => Promise<unknown>> = {
  "./schema.ts": () => import("./schema.js"),
  "./sessions.ts": () => import("./sessions.js"),
  "./http.ts": () => import("./http.js"),
  "./_generated/server.ts": () => import("./_generated/server.js"),
  "./_generated/api.js": () => import("./_generated/api.js"),
};

// Typed function references for calling Convex functions in tests
const getActiveRef = makeFunctionReference<"query">("sessions:getActive");
const getByIdRef = makeFunctionReference<"query">("sessions:getById");
const upsertRef = makeFunctionReference<"mutation">("sessions:upsert");
const markEndedRef = makeFunctionReference<"mutation">("sessions:markEnded");

function makeSessionArgs(
  overrides: Partial<{
    sessionId: string;
    userId: string;
    model: string;
    cwd: string;
    currentTool: string;
    currentTarget: string;
    notificationState: string;
    notificationMessage: string;
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    lastAssistantMessage: string;
    permissionMode: string;
    isActive: boolean;
    startedAt: number;
    updatedAt: number;
  }> = {},
) {
  return {
    sessionId: "test-session-1",
    userId: "",
    model: "claude-opus-4-6[1m]",
    cwd: "/test/cwd",
    notificationState: "none",
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    permissionMode: "default",
    isActive: true,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

describe("sessions.upsert", () => {
  it("creates a new session", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(upsertRef, makeSessionArgs());

    expect(id).toBeDefined();
    const session = await t.query(getByIdRef, { sessionId: "test-session-1" });
    expect(session).toBeDefined();
    expect(session!.sessionId).toBe("test-session-1");
    expect(session!.model).toBe("claude-opus-4-6[1m]");
    expect(session!.isActive).toBe(true);
  });

  it("updates an existing session", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(upsertRef, makeSessionArgs());

    await t.mutation(
      upsertRef,
      makeSessionArgs({
        model: "claude-sonnet-4-6",
        inputTokens: 500,
        outputTokens: 200,
      }),
    );

    const session = await t.query(getByIdRef, { sessionId: "test-session-1" });
    expect(session!.model).toBe("claude-sonnet-4-6");
    expect(session!.inputTokens).toBe(500);
    expect(session!.outputTokens).toBe(200);
  });

  it("stores optional fields correctly", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(
      upsertRef,
      makeSessionArgs({
        currentTool: "Read",
        currentTarget: "/file.ts",
        notificationMessage: "Needs permission",
        lastAssistantMessage: "Done.",
      }),
    );

    const session = await t.query(getByIdRef, { sessionId: "test-session-1" });
    expect(session!.currentTool).toBe("Read");
    expect(session!.currentTarget).toBe("/file.ts");
    expect(session!.notificationMessage).toBe("Needs permission");
    expect(session!.lastAssistantMessage).toBe("Done.");
  });
});

describe("sessions.markEnded", () => {
  it("sets isActive to false", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(upsertRef, makeSessionArgs());

    await t.mutation(markEndedRef, { sessionId: "test-session-1" });

    const session = await t.query(getByIdRef, { sessionId: "test-session-1" });
    expect(session!.isActive).toBe(false);
  });

  it("throws for nonexistent session", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(markEndedRef, { sessionId: "nonexistent" }),
    ).rejects.toThrow("Session not found: nonexistent");
  });
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

describe("sessions.getActive", () => {
  it("returns only active sessions", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(
      upsertRef,
      makeSessionArgs({ sessionId: "active-1", isActive: true }),
    );
    await t.mutation(
      upsertRef,
      makeSessionArgs({ sessionId: "active-2", isActive: true }),
    );
    await t.mutation(
      upsertRef,
      makeSessionArgs({ sessionId: "ended-1", isActive: false }),
    );

    const active = await t.query(getActiveRef);
    expect(active).toHaveLength(2);
    expect(active.map((s: { sessionId: string }) => s.sessionId).sort()).toEqual([
      "active-1",
      "active-2",
    ]);
  });

  it("returns empty array when no active sessions", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(
      upsertRef,
      makeSessionArgs({ sessionId: "ended-1", isActive: false }),
    );

    const active = await t.query(getActiveRef);
    expect(active).toHaveLength(0);
  });
});

describe("sessions.getById", () => {
  it("returns the correct session", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(
      upsertRef,
      makeSessionArgs({ sessionId: "find-me", model: "special-model" }),
    );
    await t.mutation(
      upsertRef,
      makeSessionArgs({ sessionId: "not-me", model: "other-model" }),
    );

    const session = await t.query(getByIdRef, { sessionId: "find-me" });
    expect(session).toBeDefined();
    expect(session!.model).toBe("special-model");
  });

  it("returns null for nonexistent session", async () => {
    const t = convexTest(schema, modules);

    const session = await t.query(getByIdRef, { sessionId: "nonexistent" });
    expect(session).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// HTTP action: GET /api/device/session
// ---------------------------------------------------------------------------

describe("HTTP GET /api/device/session", () => {
  beforeEach(() => {
    vi.stubEnv("BRIDGE_API_KEY", "test-secret-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 200 with active session JSON when one exists", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(
      upsertRef,
      makeSessionArgs({ sessionId: "active-session", model: "claude-opus-4-6[1m]" }),
    );

    const response = await t.fetch("/api/device/session", {
      method: "GET",
      headers: { Authorization: "Bearer test-secret-key" },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sessionId).toBe("active-session");
    expect(body.model).toBe("claude-opus-4-6[1m]");
    expect(body.isActive).toBe(true);
  });

  it("returns 204 when no active session exists", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(
      upsertRef,
      makeSessionArgs({ sessionId: "ended", isActive: false }),
    );

    const response = await t.fetch("/api/device/session", {
      method: "GET",
      headers: { Authorization: "Bearer test-secret-key" },
    });

    expect(response.status).toBe(204);
    const text = await response.text();
    expect(text).toBe("");
  });

  it("returns 204 when no sessions exist at all", async () => {
    const t = convexTest(schema, modules);

    const response = await t.fetch("/api/device/session", {
      method: "GET",
      headers: { Authorization: "Bearer test-secret-key" },
    });

    expect(response.status).toBe(204);
  });

  it("rejects requests without Authorization header", async () => {
    const t = convexTest(schema, modules);

    const response = await t.fetch("/api/device/session", { method: "GET" });
    expect(response.status).toBe(401);
  });

  it("rejects requests with invalid bearer token", async () => {
    const t = convexTest(schema, modules);

    const response = await t.fetch("/api/device/session", {
      method: "GET",
      headers: { Authorization: "Bearer wrong-key" },
    });
    expect(response.status).toBe(403);
  });

  it("rejects requests with non-Bearer auth", async () => {
    const t = convexTest(schema, modules);

    const response = await t.fetch("/api/device/session", {
      method: "GET",
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(response.status).toBe(401);
  });

  it("returns 500 when BRIDGE_API_KEY is not set", async () => {
    vi.stubEnv("BRIDGE_API_KEY", "");
    const t = convexTest(schema, modules);

    const response = await t.fetch("/api/device/session", {
      method: "GET",
      headers: { Authorization: "Bearer anything" },
    });
    expect(response.status).toBe(500);
  });

  it("returns first active session when multiple exist", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(
      upsertRef,
      makeSessionArgs({ sessionId: "first-active", isActive: true }),
    );
    await t.mutation(
      upsertRef,
      makeSessionArgs({ sessionId: "second-active", isActive: true }),
    );

    const response = await t.fetch("/api/device/session", {
      method: "GET",
      headers: { Authorization: "Bearer test-secret-key" },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    // Should return a single session object, not an array
    expect(body.sessionId).toBeDefined();
    expect(body.isActive).toBe(true);
  });

  it("response shape matches sessions table schema", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(
      upsertRef,
      makeSessionArgs({
        sessionId: "shape-check",
        model: "claude-sonnet-4-6",
        cwd: "/project",
        currentTool: "Read",
        currentTarget: "/file.ts",
        notificationState: "permission_prompt",
        notificationMessage: "Allow?",
        inputTokens: 1000,
        outputTokens: 500,
        cacheCreationInputTokens: 200,
        cacheReadInputTokens: 800,
        lastAssistantMessage: "Done.",
        permissionMode: "default",
        isActive: true,
        startedAt: 1700000000000,
        updatedAt: 1700000001000,
      }),
    );

    const response = await t.fetch("/api/device/session", {
      method: "GET",
      headers: { Authorization: "Bearer test-secret-key" },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      sessionId: "shape-check",
      model: "claude-sonnet-4-6",
      cwd: "/project",
      currentTool: "Read",
      currentTarget: "/file.ts",
      notificationState: "permission_prompt",
      notificationMessage: "Allow?",
      inputTokens: 1000,
      outputTokens: 500,
      cacheCreationInputTokens: 200,
      cacheReadInputTokens: 800,
      lastAssistantMessage: "Done.",
      permissionMode: "default",
      isActive: true,
      startedAt: 1700000000000,
      updatedAt: 1700000001000,
    });
  });
});

// ---------------------------------------------------------------------------
// HTTP action: POST /api/bridge/update
// ---------------------------------------------------------------------------

describe("HTTP POST /api/bridge/update", () => {
  beforeEach(() => {
    vi.stubEnv("BRIDGE_API_KEY", "test-secret-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests without Authorization header", async () => {
    const t = convexTest(schema, modules);

    const response = await t.fetch("/api/bridge/update", { method: "POST" });
    expect(response.status).toBe(401);
  });

  it("rejects requests with invalid bearer token", async () => {
    const t = convexTest(schema, modules);

    const response = await t.fetch("/api/bridge/update", {
      method: "POST",
      headers: { Authorization: "Bearer wrong-key" },
    });
    expect(response.status).toBe(403);
  });

  it("rejects requests with non-Bearer auth", async () => {
    const t = convexTest(schema, modules);

    const response = await t.fetch("/api/bridge/update", {
      method: "POST",
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(response.status).toBe(401);
  });

  it("returns 500 when BRIDGE_API_KEY is not set", async () => {
    vi.stubEnv("BRIDGE_API_KEY", "");
    const t = convexTest(schema, modules);

    const response = await t.fetch("/api/bridge/update", {
      method: "POST",
      headers: { Authorization: "Bearer anything" },
    });
    expect(response.status).toBe(500);
  });

  it("rejects invalid JSON body", async () => {
    const t = convexTest(schema, modules);

    const response = await t.fetch("/api/bridge/update", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-secret-key",
        "Content-Type": "text/plain",
      },
      body: "not json",
    });
    expect(response.status).toBe(400);
  });

  it("rejects invalid session payload", async () => {
    const t = convexTest(schema, modules);

    const response = await t.fetch("/api/bridge/update", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-secret-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invalid: "payload" }),
    });
    expect(response.status).toBe(400);
  });

  it("upserts session with valid payload and auth", async () => {
    const t = convexTest(schema, modules);

    const payload = makeSessionArgs({ sessionId: "http-test-1" });
    const response = await t.fetch("/api/bridge/update", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-secret-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });

    // Verify session was persisted
    const session = await t.query(getByIdRef, { sessionId: "http-test-1" });
    expect(session).toBeDefined();
    expect(session!.model).toBe("claude-opus-4-6[1m]");
  });

  it("defaults userId to empty string when omitted", async () => {
    const t = convexTest(schema, modules);

    const { userId: _, ...payloadWithoutUserId } = makeSessionArgs({
      sessionId: "no-user",
    });
    const response = await t.fetch("/api/bridge/update", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-secret-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadWithoutUserId),
    });

    expect(response.status).toBe(200);

    const session = await t.query(getByIdRef, { sessionId: "no-user" });
    expect(session!.userId).toBe("");
  });
});
