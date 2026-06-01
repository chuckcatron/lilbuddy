import { NotificationBadge } from "./NotificationBadge";
import { TokenDisplay } from "./TokenDisplay";

export interface SessionDocument {
  readonly _id: string;
  readonly sessionId: string;
  readonly model: string;
  readonly cwd: string;
  readonly currentTool?: string;
  readonly currentTarget?: string;
  readonly notificationState: "none" | "permission_prompt" | "idle_prompt";
  readonly notificationMessage?: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly lastAssistantMessage?: string;
  readonly startedAt: number;
  readonly updatedAt: number;
}

interface SessionCardProps {
  readonly session: SessionDocument;
}

function getProjectName(cwd: string): string {
  const segments = cwd.replace(/\/+$/, "").split("/");
  return segments[segments.length - 1] || cwd;
}

function shortenModel(model: string): string {
  return model.replace(/^claude-/, "");
}

function formatDuration(startedAt: number): string {
  const elapsed = Date.now() - startedAt;
  const minutes = Math.floor(elapsed / 60_000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

function truncateMessage(message: string | undefined, maxLength = 200): string {
  if (!message) return "";
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength) + "...";
}

type SessionStatus = "working" | "idle" | "needs_permission" | "needs_input";

function getStatus(session: SessionDocument): SessionStatus {
  if (session.notificationState === "permission_prompt") return "needs_permission";
  if (session.notificationState === "idle_prompt") return "needs_input";
  if (session.currentTool) return "working";
  return "idle";
}

function getStatusLabel(status: SessionStatus): string {
  switch (status) {
    case "working":
      return "Working";
    case "idle":
      return "Idle";
    case "needs_permission":
      return "Permission needed";
    case "needs_input":
      return "Needs input";
  }
}

function getStatusDotClass(status: SessionStatus): string {
  switch (status) {
    case "working":
      return "bg-green-400";
    case "idle":
      return "bg-neutral-600";
    case "needs_permission":
      return "animate-pulse bg-red-500";
    case "needs_input":
      return "animate-pulse bg-amber-500";
  }
}

function getStatusLabelClass(status: SessionStatus): string {
  switch (status) {
    case "working":
      return "text-green-400";
    case "idle":
      return "text-neutral-500";
    case "needs_permission":
      return "text-red-400";
    case "needs_input":
      return "text-amber-400";
  }
}

function getCardClasses(status: SessionStatus): string {
  switch (status) {
    case "needs_permission":
      return "border-red-500/50 bg-red-950/20";
    case "needs_input":
      return "border-amber-500/50 bg-amber-950/20";
    case "working":
      return "border-green-500/20 bg-neutral-900";
    case "idle":
      return "border-neutral-800 bg-neutral-900";
  }
}

export function SessionCard({ session }: SessionCardProps): React.ReactElement {
  const status = getStatus(session);

  return (
    <div
      className={`rounded-lg border p-4 ${getCardClasses(status)}`}
      data-testid="session-card"
    >
      {/* Header: project name + tokens/duration */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${getStatusDotClass(status)}`}
            data-testid="status-dot"
          />
          <span
            className="truncate text-lg font-semibold text-neutral-100"
            title={session.cwd}
            data-testid="project-name"
          >
            {getProjectName(session.cwd)}
          </span>
          <NotificationBadge
            state={session.notificationState}
            message={session.notificationMessage}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 text-right">
          <TokenDisplay
            inputTokens={session.inputTokens}
            outputTokens={session.outputTokens}
            cacheCreationInputTokens={session.cacheCreationInputTokens}
            cacheReadInputTokens={session.cacheReadInputTokens}
          />
          <span className="text-xs text-neutral-600">&middot;</span>
          <span className="text-xs text-neutral-600" data-testid="session-duration">
            {formatDuration(session.startedAt)}
          </span>
        </div>
      </div>

      {/* Status label */}
      <div className="mt-1 ml-4">
        <span className={`text-xs font-medium ${getStatusLabelClass(status)}`} data-testid="status-label">
          {getStatusLabel(status)}
        </span>
      </div>

      {/* Activity line — only when working */}
      {session.currentTool && (
        <div className="mt-2 ml-4 font-mono text-sm">
          <span className="text-green-400">
            {session.currentTool}
            {session.currentTarget && (
              <span className="text-neutral-500"> &rarr; {session.currentTarget}</span>
            )}
          </span>
        </div>
      )}

      {/* Last assistant message */}
      {session.lastAssistantMessage && (
        <p className="mt-2 ml-4 text-xs text-neutral-500">
          {truncateMessage(session.lastAssistantMessage)}
        </p>
      )}

      {/* Model label — bottom right */}
      <div className="mt-2 text-right">
        <span className="text-xs text-neutral-600" data-testid="model-label">
          {shortenModel(session.model)}
        </span>
      </div>
    </div>
  );
}
