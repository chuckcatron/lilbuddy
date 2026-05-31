import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NotificationBadge } from "./NotificationBadge";

describe("NotificationBadge", () => {
  it("renders idle state for 'none'", () => {
    render(<NotificationBadge state="none" />);

    const badge = screen.getByTestId("notification-badge");
    expect(badge).toHaveTextContent("idle");
    expect(badge).toHaveAttribute("data-state", "none");
  });

  it("renders 'Waiting on you' for permission_prompt", () => {
    render(<NotificationBadge state="permission_prompt" message="Allow file write?" />);

    const badge = screen.getByTestId("notification-badge");
    expect(badge).toHaveTextContent("Waiting on you");
    expect(badge).toHaveAttribute("data-state", "permission_prompt");
    expect(badge).toHaveAttribute("title", "Allow file write?");
  });

  it("renders 'Waiting on you' for idle_prompt", () => {
    render(<NotificationBadge state="idle_prompt" message="Need input" />);

    const badge = screen.getByTestId("notification-badge");
    expect(badge).toHaveTextContent("Waiting on you");
    expect(badge).toHaveAttribute("data-state", "idle_prompt");
  });

  it("uses red styling for permission_prompt", () => {
    render(<NotificationBadge state="permission_prompt" />);

    const badge = screen.getByTestId("notification-badge");
    expect(badge.className).toContain("bg-red-600");
    expect(badge.className).toContain("animate-pulse");
  });

  it("uses amber styling for idle_prompt", () => {
    render(<NotificationBadge state="idle_prompt" />);

    const badge = screen.getByTestId("notification-badge");
    expect(badge.className).toContain("bg-amber-500");
    expect(badge.className).toContain("animate-pulse");
  });

  it("uses subtle styling for none state", () => {
    render(<NotificationBadge state="none" />);

    const badge = screen.getByTestId("notification-badge");
    expect(badge.className).toContain("bg-neutral-800");
    expect(badge.className).not.toContain("animate-pulse");
  });
});
