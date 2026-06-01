import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionDocument } from "./SessionCard";
import { SessionCard } from "./SessionCard";

const baseSession: SessionDocument = {
  _id: "abc123",
  sessionId: "sess-001",
  model: "claude-opus-4-6",
  cwd: "/home/user/project",
  notificationState: "none",
  inputTokens: 5000,
  outputTokens: 2000,
  cacheCreationInputTokens: 100,
  cacheReadInputTokens: 200,
  startedAt: Date.now() - 30 * 60_000, // 30 minutes ago
  updatedAt: Date.now(),
};

describe("SessionCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-31T12:00:00Z"));
  });

  it("derives project name from cwd", () => {
    const session = { ...baseSession, startedAt: Date.now() - 5 * 60_000 };
    render(<SessionCard session={session} />);

    expect(screen.getByTestId("project-name")).toHaveTextContent("project");
  });

  it("shows full cwd as tooltip on project name", () => {
    const session = { ...baseSession, startedAt: Date.now() - 5 * 60_000 };
    render(<SessionCard session={session} />);

    expect(screen.getByTestId("project-name")).toHaveAttribute("title", "/home/user/project");
  });

  it("renders shortened model name", () => {
    const session = { ...baseSession, startedAt: Date.now() - 30 * 60_000 };
    render(<SessionCard session={session} />);

    expect(screen.getByTestId("model-label")).toHaveTextContent("opus-4-6");
  });

  it("shows current tool and target when active", () => {
    const session = {
      ...baseSession,
      startedAt: Date.now() - 5 * 60_000,
      currentTool: "Edit",
      currentTarget: "src/index.ts",
    };
    render(<SessionCard session={session} />);

    expect(screen.getByText(/Edit/)).toBeInTheDocument();
    expect(screen.getByText(/src\/index.ts/)).toBeInTheDocument();
  });

  it("shows 'Idle' status when no current tool", () => {
    const session = { ...baseSession, startedAt: Date.now() - 5 * 60_000 };
    render(<SessionCard session={session} />);

    expect(screen.getByTestId("status-label")).toHaveTextContent("Idle");
  });

  it("shows 'Working' status when tool is active", () => {
    const session = {
      ...baseSession,
      startedAt: Date.now() - 5 * 60_000,
      currentTool: "Bash",
    };
    render(<SessionCard session={session} />);

    expect(screen.getByTestId("status-label")).toHaveTextContent("Working");
  });

  it("displays token count", () => {
    const session = { ...baseSession, startedAt: Date.now() - 5 * 60_000 };
    render(<SessionCard session={session} />);

    expect(screen.getByTestId("token-display")).toHaveTextContent("7.0k tokens");
  });

  it("displays session duration", () => {
    const session = { ...baseSession, startedAt: Date.now() - 65 * 60_000 };
    render(<SessionCard session={session} />);

    expect(screen.getByTestId("session-duration")).toHaveTextContent("1h 5m");
  });

  it("displays truncated last assistant message", () => {
    const longMessage = "A".repeat(300);
    const session = {
      ...baseSession,
      startedAt: Date.now() - 5 * 60_000,
      lastAssistantMessage: longMessage,
    };
    render(<SessionCard session={session} />);

    const displayed = screen.getByText(/^A+\.\.\.$/);
    expect(displayed.textContent!.length).toBeLessThanOrEqual(203); // 200 + "..."
  });

  it("renders full message when under 200 chars", () => {
    const session = {
      ...baseSession,
      startedAt: Date.now() - 5 * 60_000,
      lastAssistantMessage: "Hello world",
    };
    render(<SessionCard session={session} />);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("highlights card red for permission_prompt", () => {
    const session = {
      ...baseSession,
      startedAt: Date.now() - 5 * 60_000,
      notificationState: "permission_prompt" as const,
      notificationMessage: "Allow?",
    };
    render(<SessionCard session={session} />);

    const card = screen.getByTestId("session-card");
    expect(card.className).toContain("border-red-500");
    expect(screen.getByTestId("status-label")).toHaveTextContent("Permission needed");
  });

  it("highlights card amber for idle_prompt", () => {
    const session = {
      ...baseSession,
      startedAt: Date.now() - 5 * 60_000,
      notificationState: "idle_prompt" as const,
    };
    render(<SessionCard session={session} />);

    const card = screen.getByTestId("session-card");
    expect(card.className).toContain("border-amber-500");
    expect(screen.getByTestId("status-label")).toHaveTextContent("Needs input");
  });

  it("shows green border when session is working", () => {
    const session = {
      ...baseSession,
      startedAt: Date.now() - 5 * 60_000,
      currentTool: "Read",
    };
    render(<SessionCard session={session} />);

    const card = screen.getByTestId("session-card");
    expect(card.className).toContain("border-green-500");
  });

  it("uses neutral styling when idle", () => {
    const session = { ...baseSession, startedAt: Date.now() - 5 * 60_000 };
    render(<SessionCard session={session} />);

    const card = screen.getByTestId("session-card");
    expect(card.className).toContain("border-neutral-800");
  });

  it("does not show activity line when idle", () => {
    const session = { ...baseSession, startedAt: Date.now() - 5 * 60_000 };
    render(<SessionCard session={session} />);

    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
  });
});
