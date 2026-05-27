# 0003 — Phase 0 captures come from a real Claude Code session in `lilbuddy/`

**Status:** Accepted
**Date:** 2026-05-27
**Phase 0 task:** 0.4

## Decision

Capture method: option **A** from [0002-hook-wiring](0002-hook-wiring.md). User opens a fresh Claude Code session inside `lilbuddy/`, drives a scripted varied workload, then returns control here for analysis.

Rejected:
- **B** (mirror hooks one dir up) — bypasses the question of whether mid-session config reload works, and introduces a config file outside the project's source-controlled scope.
- **C** (seed from docs) — violates the Phase 0 brief's "real captured event payloads" requirement and would make the go/no-go theoretical.

## Why

Phase 0 is the one phase whose entire purpose is empirical. Cutting corners here would invalidate the conclusion. Ten minutes of human-driven Claude Code work in `lilbuddy/` produces the dataset that determines whether the whole product is worth building.

## How it runs

1. Capture server is already running in the background (the agent driving this session started it; it logs to a pnpm task and listens on `127.0.0.1:8787`).
2. User opens a new terminal, `cd /Users/chuckcatron/Code/test-ideas/lilbuddy`, runs `claude`.
3. Once that session is up, user pastes the **driver prompt** below.
4. User watches Claude do the work, approving permission prompts when they appear (Bash, WebFetch, Write under `/tmp`, etc.).
5. After the session ends (`/quit`), user types `continue` back in *this* session.
6. The agent here lists `docs/hook-event-samples/` and proceeds to 0.5.

## Driver prompt (paste into the new `lilbuddy/` Claude session)

> Please run through this short test sequence so I can capture hook events. Don't optimize — just do each step in order, even if it seems trivial.
>
> 1. Run `ls -la` in the project root (Bash).
> 2. Read `apps/bridge/src/capture.ts` and tell me how many lines it is.
> 3. Search the repo for any TODO or FIXME comments with grep.
> 4. Create `/tmp/lilbuddy-phase0-test.txt` containing the text "hello from phase 0".
> 5. Edit that file to add a second line: "capture run complete".
> 6. Use WebFetch on `https://example.com` and tell me the page title.
> 7. Spawn a subagent (general-purpose) and ask it to summarize the repo's layout in 3 bullets.
> 8. Ask me a yes/no question about the project so I have a chance to approve something interactively.
> 9. After I answer, that's the end — say "done" and stop.

That should exercise: `SessionStart`, `UserPromptSubmit`, `PreToolUse`/`PostToolUse` for Bash / Read / Grep / Write / Edit / WebFetch / Task, `Notification` (permission prompts on Bash + WebFetch, depending on the user's settings), `SubagentStop` (from step 7), `Stop` (between steps), and `SessionEnd` (on `/quit`).

`PreCompact` is unlikely to fire in 10 minutes of work — skipped intentionally.

## Hand-off contract

When the user returns and types `continue`:
- This session reads `docs/hook-event-samples/`, classifies the captured events by type, and writes 0.5's analysis decision.
- If any of the four required signals (current tool, file path, token usage, "waiting on you") didn't show up in the captures, that's a Phase 0 finding — not a failure of the capture method.
