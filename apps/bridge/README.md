# @lilbuddy/bridge

Local daemon that listens to Claude Code hooks and forwards events.

## Phase 0: capture mode

Run a tiny HTTP server that writes every POSTed hook event to `docs/hook-event-samples/<timestamp>-<event>.json`.

```sh
pnpm --filter @lilbuddy/bridge capture
# or with auto-reload during dev:
pnpm --filter @lilbuddy/bridge dev
```

Listens on `http://127.0.0.1:8787` by default (override with `PORT=...`).

Hook commands should POST the event JSON they receive on stdin. The event name is taken from `hook_event_name` in the payload if present, falling back to the URL path.

## What lives here later

- Watcher for `transcript_path` JSONL to extract token usage.
- Forwarder to Convex (Phase 1).
- Pairing flow with a physical device (Phase 2).
