# 0004 — Phase 0 signal analysis: all four required signals are reachable

**Status:** Accepted
**Date:** 2026-05-27
**Phase 0 task:** 0.5
**Supersedes:** an earlier draft of this file written mid-session that classified token usage as "NOT AVAILABLE / deferred." Empirical check of `transcript_path` shows token usage is in fact reachable — see signal #3.

## Context

Phase 0's purpose is to determine whether Claude Code's hook system exposes enough real-time signal to power lil' buddy's core UX. The capture run (task 0.4, per [0003-capture-method](0003-capture-method.md)) produced **82 event files** across **7 event types** and **9 distinct tool types**, plus its full transcript JSONL.

The four required signals were defined in the Phase 0 brief:

1. **Current tool** — what tool is Claude using right now?
2. **File path** — what file is it operating on?
3. **Token usage** — how many tokens have been consumed?
4. **"Waiting on you"** — does Claude need human input?

## TL;DR

| # | Signal | Where it lives | First-class hook field? |
|---|--------|----------------|--------------------------|
| 1 | Current tool | `PreToolUse` / `PostToolUse` → `tool_name` | ✅ Yes |
| 2 | File path | `PreToolUse` / `PostToolUse` → `tool_input.*` (path-shaped per tool) | ✅ Yes |
| 3 | Token usage | **Transcript JSONL** at `transcript_path` → `message.usage` on every `type:"assistant"` record | ⚠️ No — requires tailing a file the hook hands us |
| 4 | "Waiting on you" | `Notification` event → `notification_type` (`permission_prompt` \| `idle_prompt`) + `message` | ✅ Yes |

**All four reachable. Go.**

## Dataset summary

| Event type         | Count | Key fields |
|--------------------|------:|------------|
| `SessionStart`     |     1 | `session_id`, `model`, `cwd`, `transcript_path`, `source: "startup"` |
| `UserPromptSubmit` |     3 | `prompt`, `permission_mode` |
| `PreToolUse`       |    34 | `tool_name`, `tool_input`, `tool_use_id`, `permission_mode` |
| `PostToolUse`      |    34 | `tool_name`, `tool_input`, `tool_response`, `tool_use_id` |
| `Stop`             |     3 | `last_assistant_message`, `stop_hook_active`, `permission_mode` |
| `SubagentStop`     |     4 | `agent_id`, `agent_type`, `agent_transcript_path`, `last_assistant_message` |
| `Notification`     |     3 | `notification_type`, `message` |
| `SessionEnd`       |     0 | (session still running) |
| `PreCompact`       |     0 | (no auto-compact occurred) |

Tool types exercised in `PreToolUse`: Read (×14), Bash (×8), ToolSearch (×4), Glob (×3), Write, WebFetch, Grep, Edit, Agent.

## Signal-by-signal findings

### 1. Current tool — AVAILABLE in hooks

`PreToolUse` and `PostToolUse` both carry `tool_name` as a top-level string. Every tool invocation fires both events, correlated by `tool_use_id`, giving the bridge a clean start/end bracket.

```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "ls -la /Users/chuckcatron/Code/test-ideas/lilbuddy",
    "description": "List files in project root"
  },
  "tool_use_id": "toolu_01BLyfskaoVfc6ZGWERpnYtw"
}
```

Our matcher `".*"` catches every tool including meta-tools like `ToolSearch` and `Agent`. No gaps observed.

### 2. File path — AVAILABLE in hooks, tool-shaped

The path lives in different sub-fields per tool. The bridge needs a small adapter:

| Tool | Field carrying the "thing being acted on" |
|------|-------------------------------------------|
| Read | `tool_input.file_path` |
| Write | `tool_input.file_path` |
| Edit | `tool_input.file_path` |
| Glob | `tool_input.pattern` (+ optional `path`) |
| Grep | `tool_input.pattern` (+ optional `path`) |
| Bash | `tool_input.command` (path embedded in command string) |
| WebFetch | `tool_input.url` |
| Agent | `tool_input.prompt` (free text) |

Example (Edit):

```json
{
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/tmp/lilbuddy-phase0-test.txt",
    "old_string": "hello from phase 0\n",
    "new_string": "hello from phase 0\ncapture run complete\n",
    "replace_all": false
  }
}
```

Implementation cost: ~10 lines of TS switch/case keyed on `tool_name`. Trivial.

### 3. Token usage — NOT in hook payloads, but AVAILABLE via `transcript_path`

No hook event contains `input_tokens`, `output_tokens`, or any cumulative usage field. That much was correct in the earlier draft.

What the earlier draft missed: every hook event's `transcript_path` points to a JSONL file that **does** carry full token usage. Empirical breakdown of our session's transcript (213 records):

```
record types: { progress: 109, assistant: 55, user: 36, system: 7, file-history-snapshot: 6 }
records with message.usage: 55
roles seen: ['assistant']
```

Every `type: "assistant"` record has `message.usage`:

```json
{
  "input_tokens": 1,
  "cache_creation_input_tokens": 1602,
  "cache_read_input_tokens": 40231,
  "output_tokens": 85,
  "server_tool_use": { "web_search_requests": 0, "web_fetch_requests": 0 },
  "service_tier": "standard",
  "cache_creation": {
    "ephemeral_1h_input_tokens": 1602,
    "ephemeral_5m_input_tokens": 0
  },
  "inference_geo": "",
  "iterations": [],
  "speed": "standard"
}
```

**Implication for the bridge.** A JSONL tailer (`fs.watchFile` / `chokidar`) follows `transcript_path`, parses each appended line, and on `type === "assistant"` extracts `message.usage`. Cumulative tokens become a running sum.

Cost:
- One file watcher per active session (registered on `SessionStart`, torn down on `SessionEnd`).
- Cache-aware math is nuanced. The safe initial display is `input_tokens + output_tokens`; refining to `input + cache_creation + cache_read + output` to show cache impact is a Phase 2 tweak.

**Verdict: reachable, not deferred.** Calling this "deferred" in the earlier draft understated how close the data is — the file path is handed to us in every single hook event.

### 4. "Waiting on you" — AVAILABLE in hooks, two sub-states

`Notification` fires with two distinct `notification_type` values:

```json
// permission_prompt — actionable; user must approve a specific tool
{
  "hook_event_name": "Notification",
  "notification_type": "permission_prompt",
  "message": "Claude needs your permission to use Write"
}
```

```json
// idle_prompt — informational; Claude is idle and waiting for input
{
  "hook_event_name": "Notification",
  "notification_type": "idle_prompt",
  "message": "Claude is waiting for your input"
}
```

Both carry a human-readable `message`. The `permission_prompt` form names the tool, which maps cleanly to a one-button "approve" affordance on the device. The `idle_prompt` form is the "nothing to do; go ahead and prompt me" state.

`Stop` events with `stop_hook_active: false` also indicate the agent finished its turn — a softer "your turn" signal that can drive a less-urgent device state than `Notification`.

## Bonus signals discovered

- **`SessionStart.model`** — string like `"claude-opus-4-6[1m]"`. Header on the device.
- **`SessionStart.source`** — `"startup"` for fresh sessions; presumably other values exist for resume/etc.
- **`Stop.last_assistant_message`** — full text of Claude's last reply. Perfect for a "what did Claude say?" line on the e-paper.
- **`SubagentStop.agent_id` / `agent_type` / `agent_transcript_path`** — every subagent gets its own JSONL; could power a "Claude is delegating to a subagent" device state.
- **`permission_mode`** — present on most events; transitions from `"default"` to `"acceptEdits"` when the user picks "yes, always" on a prompt. Free elevated-trust indicator.
- **`tool_use_id`** — correlates `PreToolUse` ↔ `PostToolUse`. Lets the bridge compute tool durations.
- **`Bash.tool_response.interrupted`** — boolean. Surfaces command failure cleanly.
- **`WebFetch.tool_response.durationMs`** — fetch latency.
- **`Edit.tool_response.structuredPatch`** — unified-diff-shaped object. Probably overkill for a 4.7" e-paper but available.
- **`UserPromptSubmit.prompt`** — full user message. Privacy consideration: opt-in only.

## Observations worth flagging for later phases

- **Implicit subagents.** We saw a `SubagentStop` early in the session (20:06:00) with `agent_type: ""` and an `agent_id` we never explicitly triggered. Likely a Claude-Code-internal pattern (skill, slash command, or auto-routing). Phase 1 should investigate before counting "active subagents" on the device.
- **`SessionEnd` not captured.** The session was still running when this analysis was written. We expect `SessionEnd` to fire on `/quit`; verify shape before Phase 1 finalizes lifecycle handling.
- **`PreCompact` not captured.** Only fires on auto-compaction, which didn't happen in 12 minutes of work. A deliberate long-running session captures this.

## Decision

**Go.** All four required Phase 0 signals are reachable. The hook system covers three directly; token usage requires a small JSONL tailer that follows the `transcript_path` already handed to us in every event.

### What the Phase 1 bridge needs to do

| Capability | Source | Complexity |
|------------|--------|------------|
| Receive hook events | HTTP POST (already built) | ✅ done |
| Identify current tool | `PreToolUse.tool_name` | Trivial |
| Identify current target (file/url/cmd) | `tool_input.*` per tool | Low — tool-name switch |
| Detect "waiting on you" | `Notification.notification_type` | Trivial |
| Detect "your turn / idle" | `Stop` + `Notification: idle_prompt` | Trivial |
| Track cumulative tokens | Tail `transcript_path` JSONL, sum `message.usage` on `type:"assistant"` | Medium — new file watcher |
| Track session lifecycle | `SessionStart` / `SessionEnd` | Low — TBD shape for `SessionEnd` |
| Show what Claude just said | `Stop.last_assistant_message` | Trivial |
| Forward state to Convex | new code | Medium (Phase 1 core) |

The Phase 0 capture dataset (82 files in `docs/hook-event-samples/`) is the test fixture corpus for all of the above.

## Consequences

- Phase 1 bridge design proceeds with confidence — no signal is blocked; no fundamental rework needed.
- Token usage is **not** deferred — it's in Phase 1 scope via the transcript tailer.
- `SessionEnd` payload shape is the one Phase 0 unknown we should close in a short follow-up (literally `/quit` a session and capture).
- The `transcript_path` field is load-bearing for token math. The bridge must register watchers per session and clean them up reliably.
- The full go/no-go writeup lives in [`docs/phase-0-findings.md`](../phase-0-findings.md) (task 0.6).
