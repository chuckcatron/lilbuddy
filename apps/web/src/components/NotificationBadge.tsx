type NotificationStateValue = "none" | "permission_prompt" | "idle_prompt";

interface NotificationBadgeProps {
  readonly state: NotificationStateValue;
  readonly message?: string;
}

export function NotificationBadge({ state, message }: NotificationBadgeProps): React.ReactElement | null {
  if (state === "none") {
    return null;
  }

  const isPermission = state === "permission_prompt";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
        isPermission
          ? "animate-pulse bg-red-600 text-white shadow-lg shadow-red-500/50"
          : "animate-pulse bg-amber-500 text-black shadow-lg shadow-amber-400/50"
      }`}
      data-testid="notification-badge"
      data-state={state}
      title={message}
    >
      <span className="text-base">{isPermission ? "!" : "?"}</span>
      Waiting on you
    </span>
  );
}
