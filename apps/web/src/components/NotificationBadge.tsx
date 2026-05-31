interface NotificationBadgeProps {
  readonly state: string;
  readonly message?: string;
}

export function NotificationBadge({ state, message }: NotificationBadgeProps): React.ReactElement {
  if (state === "none") {
    return (
      <span
        className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-500"
        data-testid="notification-badge"
        data-state="none"
      >
        idle
      </span>
    );
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
