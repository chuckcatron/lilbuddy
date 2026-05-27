/**
 * Hook event types derived from Phase 0 captured samples (82 events).
 * See docs/decisions/0004-signal-analysis.md for the definitive reference.
 */

// ---------------------------------------------------------------------------
// Hook event names — all 9 Claude Code hook events
// ---------------------------------------------------------------------------

export type HookEventName =
  | "Notification"
  | "PreCompact"
  | "PreToolUse"
  | "PostToolUse"
  | "SessionEnd"
  | "SessionStart"
  | "Stop"
  | "SubagentStop"
  | "UserPromptSubmit";

// ---------------------------------------------------------------------------
// Known tool names — observed in Phase 0 capture + common Claude Code tools
// ---------------------------------------------------------------------------

export type KnownToolName =
  | "Agent"
  | "Bash"
  | "Edit"
  | "Glob"
  | "Grep"
  | "Read"
  | "ToolSearch"
  | "WebFetch"
  | "Write";

/** Tool name field allows unknown tools we haven't seen yet. */
export type ToolName = KnownToolName | (string & {});

// ---------------------------------------------------------------------------
// Notification types
// ---------------------------------------------------------------------------

export type NotificationType = "idle_prompt" | "permission_prompt";

// ---------------------------------------------------------------------------
// Base fields present on every hook event
// ---------------------------------------------------------------------------

interface HookEventBase {
  readonly cwd: string;
  readonly hook_event_name: HookEventName;
  readonly session_id: string;
  readonly transcript_path: string;
}

// ---------------------------------------------------------------------------
// Per-event payload shapes
// ---------------------------------------------------------------------------

export interface SessionStartPayload extends HookEventBase {
  readonly hook_event_name: "SessionStart";
  readonly model: string;
  readonly source: string;
}

export interface SessionEndPayload extends HookEventBase {
  readonly hook_event_name: "SessionEnd";
}

export interface UserPromptSubmitPayload extends HookEventBase {
  readonly hook_event_name: "UserPromptSubmit";
  readonly permission_mode: string;
  readonly prompt: string;
}

export interface PreToolUsePayload extends HookEventBase {
  readonly hook_event_name: "PreToolUse";
  readonly permission_mode: string;
  readonly tool_input: Record<string, unknown>;
  readonly tool_name: ToolName;
  readonly tool_use_id: string;
}

export interface PostToolUsePayload extends HookEventBase {
  readonly hook_event_name: "PostToolUse";
  readonly permission_mode: string;
  readonly tool_input: Record<string, unknown>;
  readonly tool_name: ToolName;
  readonly tool_response: Record<string, unknown>;
  readonly tool_use_id: string;
}

export interface StopPayload extends HookEventBase {
  readonly hook_event_name: "Stop";
  readonly last_assistant_message: string;
  readonly permission_mode: string;
  readonly stop_hook_active: boolean;
}

export interface SubagentStopPayload extends HookEventBase {
  readonly agent_id: string;
  readonly agent_transcript_path: string;
  readonly agent_type: string;
  readonly hook_event_name: "SubagentStop";
  readonly last_assistant_message: string;
  readonly permission_mode: string;
  readonly stop_hook_active: boolean;
}

export interface NotificationPayload extends HookEventBase {
  readonly hook_event_name: "Notification";
  readonly message: string;
  readonly notification_type: NotificationType;
}

export interface PreCompactPayload extends HookEventBase {
  readonly hook_event_name: "PreCompact";
}

// ---------------------------------------------------------------------------
// Discriminated union — the bridge reducer switches on hook_event_name
// ---------------------------------------------------------------------------

export type HookPayload =
  | NotificationPayload
  | PostToolUsePayload
  | PreCompactPayload
  | PreToolUsePayload
  | SessionEndPayload
  | SessionStartPayload
  | StopPayload
  | SubagentStopPayload
  | UserPromptSubmitPayload;
