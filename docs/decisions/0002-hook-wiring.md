# 0002 — Hook config is project-local and POSTs every event to the capture server

**Status:** Accepted
**Date:** 2026-05-27
**Phase 0 task:** 0.3

## Context

To capture real Claude Code payloads we need hook configuration that:

1. Fires for the events that carry Phase 0's required signals (tool, file, "waiting on you").
2. Doesn't block agent execution if the capture server is down.
3. Doesn't leak across into unrelated Claude Code sessions on this machine.

## Decision

Hook config lives at `lilbuddy/.claude/settings.json` (project-local). Not `~/.claude/settings.json` (global) and not `.claude/settings.local.json` (gitignored personal override).

All nine hook events are wired:

`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `Notification`, `SessionStart`, `SessionEnd`, `PreCompact`.

Each fires the same shape of command:

```sh
curl -sS -m 1 -X POST http://127.0.0.1:8787/<EventName> \
  -H 'Content-Type: application/json' \
  --data-binary @- \
  >/dev/null 2>&1 || true
```

`PreToolUse` and `PostToolUse` use `matcher: ".*"` to fire for every tool.

## Why these choices

- **Project-local, not global.** Hooks only fire when Claude Code is launched inside `lilbuddy/`. Other dev work elsewhere on the machine is unaffected. Trade-off: capturing for Phase 0 requires a session started in `lilbuddy/` — that's a real constraint surfaced below.
- **Committed (`settings.json`), not local-only (`settings.local.json`).** This config IS the project's contract with Claude Code; anyone (including future-us) cloning the repo and running the capture server should get the same instrumentation. Failed curls in absence of the server are harmless (`-m 1` caps at 1s, `|| true` swallows nonzero).
- **All nine events wired up-front.** Phase 0 is supposed to teach us what's in each payload. Hand-picking a subset risks missing the event that actually carries the signal (e.g., "waiting on you" probably lives in `Notification`, but we shouldn't assume).
- **Per-event URL paths.** Capture server already keys filenames off `hook_event_name` in the payload, but routing each event to its own URL is a belt-and-suspenders identifier and makes server logs grep-friendly.
- **`-m 1` and `|| true`.** Hooks run synchronously and their exit codes can influence Claude Code's tool execution. Fire-and-forget keeps the capture path invisible to the user when the server is off.
- **127.0.0.1 only.** Same constraint as the server: never expose hook traffic on a real network interface.

## Consequences

- **0.4 needs a Claude Code session launched inside `lilbuddy/`.** The current session driving Phase 0 has cwd `/Users/chuckcatron/Code/test-ideas` (one level up), so its hooks aren't loaded. Options for 0.4 are listed at the bottom of this file.
- Hook config is now part of the project's source. Stripping or relocating it (e.g., to `settings.local.json`) is a future-us decision once Phase 1 lands and the bridge does more than disk-capture.
- The capture server is now a soft dependency of any Claude session in this repo. Surface this in the bridge README (already done).

## Verification

Simulated a PreToolUse hook firing — exact same curl command shape, mock payload on stdin:

```sh
echo '{"hook_event_name":"PreToolUse","session_id":"sim-001","transcript_path":"/tmp/fake.jsonl","cwd":"/Users/chuckcatron/Code/test-ideas/lilbuddy","tool_name":"Read","tool_input":{"file_path":".../README.md"}}' \
| curl -sS -m 1 -X POST http://127.0.0.1:8787/PreToolUse \
  -H 'Content-Type: application/json' --data-binary @-
```

Result file: `docs/hook-event-samples/2026-05-27T19-57-38-929Z-PreToolUse.json`. Payload preserved, filename derived from `hook_event_name`. Hook wiring shape is sound.

## What 0.4 needs

The current Claude Code session can't fire these hooks (wrong cwd). To get **real** event payloads, one of:

- **A.** User opens a fresh Claude Code session in `lilbuddy/` and drives a varied workload (Bash, Edit/Write/Read, WebFetch, an Agent invocation, a permission-prompt moment). Cleanest, most honest data. Requires user time.
- **B.** Temporarily mirror this hook config to `/Users/chuckcatron/Code/test-ideas/.claude/settings.json` so the current Claude session picks it up (if mid-session config reload is supported — uncertain). Lower honesty, more convenient.
- **C.** Skip live capture and seed `docs/hook-event-samples/` with payloads from Anthropic's hooks documentation. Fast but not "real captured event payloads" per the Phase 0 brief.

Recommended: **A**. Decided in 0003 once user input arrives.
