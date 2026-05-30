import { EventEmitter } from "node:events";

import type { HookPayload, SessionState, TokenUsage } from "@lilbuddy/shared";
import { EMPTY_TOKEN_USAGE, NO_NOTIFICATION, extractToolTarget } from "@lilbuddy/shared";

// ---------------------------------------------------------------------------
// Pure reducer — no side effects, fully testable
// ---------------------------------------------------------------------------

function createSession(event: HookPayload): SessionState {
  return {
    cwd: event.cwd,
    currentTarget: undefined,
    currentTool: undefined,
    currentToolUseId: undefined,
    isActive: true,
    lastAssistantMessage: undefined,
    model: event.hook_event_name === "SessionStart" ? event.model : "",
    notificationState: NO_NOTIFICATION,
    permissionMode: "",
    sessionId: event.session_id,
    startedAt: Date.now(),
    tokens: EMPTY_TOKEN_USAGE,
    transcriptPath: event.transcript_path,
    updatedAt: Date.now(),
  };
}

export function reduce(state: SessionState, event: HookPayload): SessionState {
  const now = Date.now();

  switch (event.hook_event_name) {
    case "SessionStart":
      return {
        ...state,
        cwd: event.cwd,
        model: event.model,
        transcriptPath: event.transcript_path,
        startedAt: now,
        updatedAt: now,
      };

    case "PreToolUse":
      return {
        ...state,
        currentTool: event.tool_name,
        currentTarget: extractToolTarget(event.tool_name, event.tool_input),
        currentToolUseId: event.tool_use_id,
        notificationState: NO_NOTIFICATION,
        permissionMode: event.permission_mode,
        updatedAt: now,
      };

    case "PostToolUse":
      return {
        ...state,
        currentTool: undefined,
        currentTarget: undefined,
        currentToolUseId: undefined,
        permissionMode: event.permission_mode,
        updatedAt: now,
      };

    case "Notification":
      return {
        ...state,
        notificationState: {
          type: event.notification_type,
          message: event.message,
        },
        updatedAt: now,
      };

    case "Stop":
      return {
        ...state,
        lastAssistantMessage: event.last_assistant_message,
        currentTool: undefined,
        currentTarget: undefined,
        currentToolUseId: undefined,
        permissionMode: event.permission_mode,
        updatedAt: now,
      };

    case "UserPromptSubmit":
      return {
        ...state,
        notificationState: NO_NOTIFICATION,
        permissionMode: event.permission_mode,
        updatedAt: now,
      };

    case "SessionEnd":
      return {
        ...state,
        isActive: false,
        updatedAt: now,
      };

    case "SubagentStop":
      // Track for future use — no state change beyond updatedAt
      return {
        ...state,
        permissionMode: event.permission_mode,
        updatedAt: now,
      };

    case "PreCompact":
      // No-op for future use
      return {
        ...state,
        updatedAt: now,
      };
  }
}

// ---------------------------------------------------------------------------
// SessionStore — EventEmitter wrapper around the pure reducer
// ---------------------------------------------------------------------------

export interface SessionStoreEvents {
  stateChanged: [state: SessionState];
}

export class SessionStore extends EventEmitter<SessionStoreEvents> {
  readonly #sessions = new Map<string, SessionState>();

  get sessions(): ReadonlyMap<string, SessionState> {
    return this.#sessions;
  }

  get(sessionId: string): SessionState | undefined {
    return this.#sessions.get(sessionId);
  }

  apply(event: HookPayload): SessionState {
    const existing = this.#sessions.get(event.session_id);
    const state = existing ?? createSession(event);
    const next = reduce(state, event);

    this.#sessions.set(event.session_id, next);
    this.emit("stateChanged", next);

    return next;
  }

  updateTokens(sessionId: string, tokens: TokenUsage): void {
    const state = this.#sessions.get(sessionId);
    if (!state) return;

    const next: SessionState = {
      ...state,
      tokens,
      updatedAt: Date.now(),
    };

    this.#sessions.set(sessionId, next);
    this.emit("stateChanged", next);
  }
}
