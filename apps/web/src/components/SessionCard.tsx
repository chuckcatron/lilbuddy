import { NotificationBadge } from "./NotificationBadge";
import { TokenDisplay } from "./TokenDisplay";

interface SessionDocument {
  readonly _id: string;
  readonly sessionId: string;
  readonly model: string;
  readonly cwd: string;
  readonly currentTool?: string;
  readonly currentTarget?: string;
  readonly notificationState: string;
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

export function SessionCard({ session }: SessionCardProps): React.ReactElement {
  const isWaiting = session.notificationState !== "none";

  return (
    <div
      className={`rounded-lg border p-4 ${
        isWaiting
          ? "border-red-500/50 bg-red-950/20"
          : "border-neutral-800 bg-neutral-900"
      }`}
      data-testid="session-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-neutral-200">{session.model}</span>
            <NotificationBadge
              state={session.notificationState}
              message={session.notificationMessage}
            />
          </div>

          <div className="mt-2 font-mono text-sm">
            {session.currentTool ? (
              <span className="text-green-400">
                {session.currentTool}
                {session.currentTarget && (
                  <span className="text-neutral-500"> → {session.currentTarget}</span>
                )}
              </span>
            ) : (
              <span className="text-neutral-600">idle</span>
            )}
          </div>

          {session.lastAssistantMessage && (
            <p className="mt-2 text-sm text-neutral-400">
              {truncateMessage(session.lastAssistantMessage)}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <TokenDisplay
            inputTokens={session.inputTokens}
            outputTokens={session.outputTokens}
            cacheCreationInputTokens={session.cacheCreationInputTokens}
            cacheReadInputTokens={session.cacheReadInputTokens}
          />
          <span className="text-xs text-neutral-600" data-testid="session-duration">
            {formatDuration(session.startedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
