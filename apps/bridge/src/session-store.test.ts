import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import type {
  HookPayload,
  NotificationPayload,
  PostToolUsePayload,
  PreCompactPayload,
  PreToolUsePayload,
  SessionEndPayload,
  SessionStartPayload,
  StopPayload,
  SubagentStopPayload,
  UserPromptSubmitPayload,
} from "@lilbuddy/shared";
import { EMPTY_TOKEN_USAGE, NO_NOTIFICATION } from "@lilbuddy/shared";

import { SessionStore, reduce } from "./session-store.js";

// ---------------------------------------------------------------------------
// Shared test fixtures
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

function makeBaseState() {
  const store = new SessionStore();
  store.apply(makeSessionStart());
  return store.get(BASE_FIELDS.session_id)!;
}

// ---------------------------------------------------------------------------
// Pure reducer: unit tests per event type
// ---------------------------------------------------------------------------

describe("reduce", () => {
  describe("SessionStart", () => {
    it("sets model, cwd, and transcriptPath", () => {
      const state = makeBaseState();
      const event = makeSessionStart({ model: "claude-sonnet-4-6" });
      const next = reduce(state, event);

      expect(next.model).toBe("claude-sonnet-4-6");
      expect(next.cwd).toBe(BASE_FIELDS.cwd);
      expect(next.transcriptPath).toBe(BASE_FIELDS.transcript_path);
    });
  });

  describe("PreToolUse", () => {
    it("sets currentTool, currentTarget, and currentToolUseId", () => {
      const state = makeBaseState();
      const event: PreToolUsePayload = {
        ...BASE_FIELDS,
        hook_event_name: "PreToolUse",
        permission_mode: "default",
        tool_name: "Read",
        tool_input: { file_path: "/some/file.ts" },
        tool_use_id: "toolu_123",
      };
      const next = reduce(state, event);

      expect(next.currentTool).toBe("Read");
      expect(next.currentTarget).toBe("/some/file.ts");
      expect(next.currentToolUseId).toBe("toolu_123");
    });

    it("clears notificationState", () => {
      const state = {
        ...makeBaseState(),
        notificationState: {
          type: "permission_prompt" as const,
          message: "needs permission",
        },
      };
      const event: PreToolUsePayload = {
        ...BASE_FIELDS,
        hook_event_name: "PreToolUse",
        permission_mode: "default",
        tool_name: "Bash",
        tool_input: { command: "ls" },
        tool_use_id: "toolu_456",
      };
      const next = reduce(state, event);

      expect(next.notificationState).toEqual(NO_NOTIFICATION);
    });

    it("extracts target for Glob tool", () => {
      const state = makeBaseState();
      const event: PreToolUsePayload = {
        ...BASE_FIELDS,
        hook_event_name: "PreToolUse",
        permission_mode: "default",
        tool_name: "Glob",
        tool_input: { pattern: "**/*.ts" },
        tool_use_id: "toolu_789",
      };
      const next = reduce(state, event);

      expect(next.currentTool).toBe("Glob");
      expect(next.currentTarget).toBe("**/*.ts");
    });
  });

  describe("PostToolUse", () => {
    it("clears currentTool, currentTarget, and currentToolUseId", () => {
      const state = {
        ...makeBaseState(),
        currentTool: "Read" as const,
        currentTarget: "/some/file.ts",
        currentToolUseId: "toolu_123",
      };
      const event: PostToolUsePayload = {
        ...BASE_FIELDS,
        hook_event_name: "PostToolUse",
        permission_mode: "default",
        tool_name: "Read",
        tool_input: { file_path: "/some/file.ts" },
        tool_response: { content: "file contents" },
        tool_use_id: "toolu_123",
      };
      const next = reduce(state, event);

      expect(next.currentTool).toBeUndefined();
      expect(next.currentTarget).toBeUndefined();
      expect(next.currentToolUseId).toBeUndefined();
    });
  });

  describe("Notification", () => {
    it("sets notificationState for permission_prompt", () => {
      const state = makeBaseState();
      const event: NotificationPayload = {
        ...BASE_FIELDS,
        hook_event_name: "Notification",
        notification_type: "permission_prompt",
        message: "Claude needs your permission to use Write",
      };
      const next = reduce(state, event);

      expect(next.notificationState).toEqual({
        type: "permission_prompt",
        message: "Claude needs your permission to use Write",
      });
    });

    it("sets notificationState for idle_prompt", () => {
      const state = makeBaseState();
      const event: NotificationPayload = {
        ...BASE_FIELDS,
        hook_event_name: "Notification",
        notification_type: "idle_prompt",
        message: "Claude is waiting for your input",
      };
      const next = reduce(state, event);

      expect(next.notificationState).toEqual({
        type: "idle_prompt",
        message: "Claude is waiting for your input",
      });
    });
  });

  describe("Stop", () => {
    it("sets lastAssistantMessage and clears tool state", () => {
      const state = {
        ...makeBaseState(),
        currentTool: "Bash" as const,
        currentTarget: "ls -la",
        currentToolUseId: "toolu_999",
      };
      const event: StopPayload = {
        ...BASE_FIELDS,
        hook_event_name: "Stop",
        last_assistant_message: "I've completed the task.",
        permission_mode: "default",
        stop_hook_active: false,
      };
      const next = reduce(state, event);

      expect(next.lastAssistantMessage).toBe("I've completed the task.");
      expect(next.currentTool).toBeUndefined();
      expect(next.currentTarget).toBeUndefined();
      expect(next.currentToolUseId).toBeUndefined();
    });
  });

  describe("UserPromptSubmit", () => {
    it("clears notificationState", () => {
      const state = {
        ...makeBaseState(),
        notificationState: {
          type: "permission_prompt" as const,
          message: "needs permission",
        },
      };
      const event: UserPromptSubmitPayload = {
        ...BASE_FIELDS,
        hook_event_name: "UserPromptSubmit",
        permission_mode: "default",
        prompt: "yes, go ahead",
      };
      const next = reduce(state, event);

      expect(next.notificationState).toEqual(NO_NOTIFICATION);
    });
  });

  describe("SessionEnd", () => {
    it("sets isActive to false", () => {
      const state = makeBaseState();
      expect(state.isActive).toBe(true);

      const event: SessionEndPayload = {
        ...BASE_FIELDS,
        hook_event_name: "SessionEnd",
      };
      const next = reduce(state, event);

      expect(next.isActive).toBe(false);
    });
  });

  describe("SubagentStop", () => {
    it("updates permissionMode and updatedAt", () => {
      const state = makeBaseState();
      const event: SubagentStopPayload = {
        ...BASE_FIELDS,
        hook_event_name: "SubagentStop",
        agent_id: "agent-1",
        agent_transcript_path: "/test/agent.jsonl",
        agent_type: "Explore",
        last_assistant_message: "Done exploring.",
        permission_mode: "plan",
        stop_hook_active: false,
      };
      const next = reduce(state, event);

      expect(next.permissionMode).toBe("plan");
    });
  });

  describe("PreCompact", () => {
    it("updates updatedAt without changing other fields", () => {
      const state = {
        ...makeBaseState(),
        currentTool: "Read" as const,
        currentTarget: "/file.ts",
        lastAssistantMessage: "hello",
      };
      const event: PreCompactPayload = {
        ...BASE_FIELDS,
        hook_event_name: "PreCompact",
      };
      const next = reduce(state, event);

      expect(next.currentTool).toBe("Read");
      expect(next.currentTarget).toBe("/file.ts");
      expect(next.lastAssistantMessage).toBe("hello");
    });
  });

  describe("immutability", () => {
    it("does not mutate the input state", () => {
      const state = makeBaseState();
      const frozen = Object.freeze({ ...state });
      const event: SessionEndPayload = {
        ...BASE_FIELDS,
        hook_event_name: "SessionEnd",
      };

      // Should not throw — reducer creates a new object
      const next = reduce(frozen, event);
      expect(next).not.toBe(frozen);
      expect(next.isActive).toBe(false);
      expect(frozen.isActive).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// SessionStore: EventEmitter integration
// ---------------------------------------------------------------------------

describe("SessionStore", () => {
  it("creates a new session on first event", () => {
    const store = new SessionStore();
    const state = store.apply(makeSessionStart());

    expect(state.sessionId).toBe(BASE_FIELDS.session_id);
    expect(state.model).toBe("claude-opus-4-6[1m]");
    expect(state.isActive).toBe(true);
    expect(state.tokens).toEqual(EMPTY_TOKEN_USAGE);
  });

  it("returns the session via get()", () => {
    const store = new SessionStore();
    store.apply(makeSessionStart());

    const state = store.get(BASE_FIELDS.session_id);
    expect(state).toBeDefined();
    expect(state!.model).toBe("claude-opus-4-6[1m]");
  });

  it("returns undefined for unknown session", () => {
    const store = new SessionStore();
    expect(store.get("nonexistent")).toBeUndefined();
  });

  it("exposes sessions as a ReadonlyMap", () => {
    const store = new SessionStore();
    store.apply(makeSessionStart());

    expect(store.sessions.size).toBe(1);
    expect(store.sessions.get(BASE_FIELDS.session_id)).toBeDefined();
  });

  it("emits stateChanged after every apply()", () => {
    const store = new SessionStore();
    const listener = vi.fn();
    store.on("stateChanged", listener);

    store.apply(makeSessionStart());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: BASE_FIELDS.session_id }),
    );

    const endEvent: SessionEndPayload = {
      ...BASE_FIELDS,
      hook_event_name: "SessionEnd",
    };
    store.apply(endEvent);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ isActive: false }),
    );
  });

  it("tracks multiple sessions independently", () => {
    const store = new SessionStore();
    store.apply(makeSessionStart({ session_id: "session-a", model: "model-a" }));
    store.apply(makeSessionStart({ session_id: "session-b", model: "model-b" }));

    expect(store.sessions.size).toBe(2);
    expect(store.get("session-a")!.model).toBe("model-a");
    expect(store.get("session-b")!.model).toBe("model-b");
  });

  describe("updateTokens", () => {
    it("merges tokens into session state", () => {
      const store = new SessionStore();
      store.apply(makeSessionStart());

      const tokens = {
        cacheCreationInputTokens: 100,
        cacheReadInputTokens: 200,
        inputTokens: 500,
        outputTokens: 300,
      };
      store.updateTokens(BASE_FIELDS.session_id, tokens);

      const state = store.get(BASE_FIELDS.session_id)!;
      expect(state.tokens).toEqual(tokens);
    });

    it("emits stateChanged with updated tokens", () => {
      const store = new SessionStore();
      store.apply(makeSessionStart());

      const listener = vi.fn();
      store.on("stateChanged", listener);

      const tokens = {
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        inputTokens: 100,
        outputTokens: 50,
      };
      store.updateTokens(BASE_FIELDS.session_id, tokens);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ tokens }),
      );
    });

    it("does nothing for unknown session", () => {
      const store = new SessionStore();
      const listener = vi.fn();
      store.on("stateChanged", listener);

      store.updateTokens("nonexistent", {
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        inputTokens: 100,
        outputTokens: 50,
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("updateModel", () => {
    it("sets the model on session state", () => {
      const store = new SessionStore();
      store.apply(makeSessionStart({ model: "" }));

      store.updateModel(BASE_FIELDS.session_id, "claude-opus-4-8");

      expect(store.get(BASE_FIELDS.session_id)!.model).toBe("claude-opus-4-8");
    });

    it("emits stateChanged with the updated model", () => {
      const store = new SessionStore();
      store.apply(makeSessionStart({ model: "" }));

      const listener = vi.fn();
      store.on("stateChanged", listener);

      store.updateModel(BASE_FIELDS.session_id, "claude-opus-4-8");

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ model: "claude-opus-4-8" }),
      );
    });

    it("does nothing for unknown session", () => {
      const store = new SessionStore();
      const listener = vi.fn();
      store.on("stateChanged", listener);

      store.updateModel("nonexistent", "claude-opus-4-8");

      expect(listener).not.toHaveBeenCalled();
    });

    it("does nothing when the model is empty or unchanged", () => {
      const store = new SessionStore();
      store.apply(makeSessionStart({ model: "claude-opus-4-8" }));

      const listener = vi.fn();
      store.on("stateChanged", listener);

      store.updateModel(BASE_FIELDS.session_id, ""); // empty → ignored
      store.updateModel(BASE_FIELDS.session_id, "claude-opus-4-8"); // unchanged → ignored

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Replay test: feed all 82 captured samples through the store
// ---------------------------------------------------------------------------

describe("replay captured samples", () => {
  it("processes all 82 hook events and produces valid final state", async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const samplesDir = resolve(here, "../../../docs/hook-event-samples");

    const files = (await readdir(samplesDir))
      .filter((f) => f.endsWith(".json"))
      .sort(); // filenames are timestamped → chronological order

    expect(files.length).toBe(82);

    const store = new SessionStore();

    for (const file of files) {
      const raw = await readFile(resolve(samplesDir, file), "utf8");
      const event = JSON.parse(raw) as HookPayload;
      store.apply(event);
    }

    // All events are from one session
    expect(store.sessions.size).toBe(1);

    const sessionId = "39a8e065-37cb-4598-b57b-74f43c0a883b";
    const state = store.get(sessionId);
    expect(state).toBeDefined();
    expect(state!.sessionId).toBe(sessionId);
    expect(state!.model).toBe("claude-opus-4-6[1m]");
    expect(state!.cwd).toBe("/Users/chuckcatron/Code/test-ideas/lilbuddy");
    expect(state!.isActive).toBe(true); // no SessionEnd in samples
    expect(state!.tokens).toEqual(EMPTY_TOKEN_USAGE); // token tracking is future work

    // After 82 events, tool state should be clear (last events are PostToolUse pairs)
    // and there should be a lastAssistantMessage from the Stop events
    expect(state!.lastAssistantMessage).toBeDefined();
  });

  it("handles synthetic SessionEnd correctly", () => {
    const store = new SessionStore();
    store.apply(makeSessionStart());

    const endEvent: SessionEndPayload = {
      ...BASE_FIELDS,
      hook_event_name: "SessionEnd",
    };
    store.apply(endEvent);

    const state = store.get(BASE_FIELDS.session_id)!;
    expect(state.isActive).toBe(false);
  });

  it("handles synthetic PreCompact as no-op", () => {
    const store = new SessionStore();
    store.apply(makeSessionStart());

    const stateBefore = store.get(BASE_FIELDS.session_id)!;
    const modelBefore = stateBefore.model;

    const compactEvent: PreCompactPayload = {
      ...BASE_FIELDS,
      hook_event_name: "PreCompact",
    };
    store.apply(compactEvent);

    const stateAfter = store.get(BASE_FIELDS.session_id)!;
    expect(stateAfter.model).toBe(modelBefore);
    expect(stateAfter.isActive).toBe(true);
  });
});
