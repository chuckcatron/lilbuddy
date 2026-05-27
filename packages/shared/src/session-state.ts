/**
 * Session state interfaces — the core data model that flows through the
 * bridge → Convex → dashboard → firmware pipeline.
 */

import type { NotificationType, ToolName } from "./hook-events.js";

// ---------------------------------------------------------------------------
// Token usage — mirrors the transcript JSONL `message.usage` shape
// ---------------------------------------------------------------------------

export interface TokenUsage {
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export const EMPTY_TOKEN_USAGE: TokenUsage = {
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
};

// ---------------------------------------------------------------------------
// Notification state
// ---------------------------------------------------------------------------

export type NotificationState =
  | { readonly type: "none" }
  | { readonly message: string; readonly type: NotificationType };

export const NO_NOTIFICATION: NotificationState = { type: "none" };

// ---------------------------------------------------------------------------
// Session state — the per-session snapshot pushed to Convex
// ---------------------------------------------------------------------------

export interface SessionState {
  readonly cwd: string;
  readonly currentTarget: string | undefined;
  readonly currentTool: ToolName | undefined;
  readonly currentToolUseId: string | undefined;
  readonly isActive: boolean;
  readonly lastAssistantMessage: string | undefined;
  readonly model: string;
  readonly notificationState: NotificationState;
  readonly permissionMode: string;
  readonly sessionId: string;
  readonly startedAt: number;
  readonly tokens: TokenUsage;
  readonly transcriptPath: string;
  readonly updatedAt: number;
}
