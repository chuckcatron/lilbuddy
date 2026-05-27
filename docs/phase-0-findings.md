# Phase 0 findings — lil' buddy

**Date:** 2026-05-27
**Phase:** 0 — de-risk hooks API
**Task:** 0.6 — written go/no-go

## Verdict: **Go.**

Claude Code's hook system, combined with the transcript JSONL it hands us a path to on every event, exposes all four signals lil' buddy's v1 display needs (current tool, file path, token usage, "waiting on you"). Three are direct fields in hook payloads; the fourth (token usage) is a 30-minute JSONL-tailer away. No fundamental signal is missing or blocked. Phase 1 (cloud spine: bridge → Convex → dashboard) is unblocked.

## How we tested

1. Scaffolded the bridge daemon as a workspace package with a tiny `node:http` capture server (bound to `127.0.0.1:8787`) that writes every POSTed hook event to `docs/hook-event-samples/<iso-ts>-<event>.json`. See [ADR 0001](decisions/0001-capture-server.md).
2. Wired all nine Claude Code hook events in `lilbuddy/.claude/settings.json` to POST to the capture server with fire-and-forget curl. See [ADR 0002](decisions/0002-hook-wiring.md).
3. Ran a real human-driven Claude Code session inside `lilbuddy/` from a scripted driver prompt — Bash, Read, Write, Edit, Grep, Glob, WebFetch, Agent (subagent), ToolSearch, and two permission prompts. See [ADR 0003](decisions/0003-capture-method.md).
4. Analyzed the 82 captured payloads + the session's 213-record transcript JSONL. See [ADR 0004](decisions/0004-signal-analysis.md).

Total elapsed: a few hours; the live capture run itself was ~12 minutes.

## What we found

| # | Required signal | Available? | Source |
|---|-----------------|------------|--------|
| 1 | Current tool | ✅ | `PreToolUse.tool_name` / `PostToolUse.tool_name` |
| 2 | File path | ✅ | `PreToolUse.tool_input.*` (tool-shaped per tool) |
| 3 | Token usage | ✅\* | Tail `transcript_path` JSONL → `message.usage` on every `type:"assistant"` record |
| 4 | "Waiting on you" | ✅ | `Notification.notification_type` (`permission_prompt` / `idle_prompt`) |

\* Not first-class in hook payloads — requires a small file watcher. Full usage record exposes input/output tokens plus cache-aware breakdown.

Bonus useful signals discovered: `SessionStart.model`, `Stop.last_assistant_message`, `SubagentStop.agent_*`, `permission_mode` transitions, `tool_use_id` for Pre/Post correlation, `Bash.tool_response.interrupted`, `WebFetch.tool_response.durationMs`. Detail in [ADR 0004](decisions/0004-signal-analysis.md).

## What we did *not* close

Honest open items, in priority order:

1. **`SessionEnd` shape.** Session was still running at write time, so we didn't capture this event. Fix in ~30 seconds: `/quit` an existing instrumented session, inspect the resulting capture. Doesn't change the Go/No-Go.
2. **`PreCompact` shape.** Only fires on auto-compaction; the test session was too short. Capture during a deliberately long-running session in early Phase 1.
3. **Implicit subagents.** Saw a `SubagentStop` early in the run with `agent_type: ""` that we didn't explicitly invoke. Likely a Claude-Code-internal pattern (skill/slash command/auto-routing). Worth understanding before the device shows an "active subagents" count.
4. **Cache-aware token math.** The transcript exposes `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`. The honest "tokens consumed" display is some combination of these. Phase 1 ships with `input + output`; refine later.

## My confidence before vs. after

The briefing flagged hook payload richness at **75% confident**. After this run: **>95% confident** the four signals are reachable. Token usage being one indirection away (file tail) is the only mild surprise — it's still reachable in real time and via a path the hook itself hands us.

## What Phase 1 must build (preview, not commitment)

The capture server in `apps/bridge/` is the seed of the production bridge. Phase 1 extends it with:

- **Transcript tailer.** `fs.watchFile` (or `chokidar`) on `transcript_path`; on each appended `assistant` record, accumulate `message.usage`. Register watchers on `SessionStart`, tear down on `SessionEnd`.
- **Session state machine.** Per-`session_id`: current tool, current target, current notification (if any), cumulative tokens, model, last_assistant_message.
- **Convex forwarder.** Start with HTTP polling per the briefing's transport plan; evaluate SSE in week 3.

None of this is blocked by Phase 0.

## Evidence

- ADRs: [0001](decisions/0001-capture-server.md), [0002](decisions/0002-hook-wiring.md), [0003](decisions/0003-capture-method.md), [0004](decisions/0004-signal-analysis.md).
- 82 raw captured payloads in [`docs/hook-event-samples/`](hook-event-samples/).
- Transcript JSONL (machine-local, not committed): `/Users/chuckcatron/.claude/projects/-Users-chuckcatron-Code-test-ideas-lilbuddy/39a8e065-37cb-4598-b57b-74f43c0a883b.jsonl`.

---

**Phase 0 closes. Phase 1 starts after `SessionEnd` is captured to close item 1 above.**
