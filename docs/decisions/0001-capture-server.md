# 0001 — Phase 0 capture server lives in `apps/bridge/`

**Status:** Accepted
**Date:** 2026-05-27
**Phase 0 task:** 0.2

## Context

Phase 0 needs to prove Claude Code's hooks API exposes enough useful data (current tool, file path, token usage, "waiting on you" signal) to justify building lil' buddy. To do that, we need real captured payloads.

The question was whether to throw together a one-off script (faster, disposable) or build the capture path inside `apps/bridge/` where the eventual production daemon lives.

## Decision

Capture server lives at `apps/bridge/src/capture.ts`:

- `@lilbuddy/bridge` workspace package, `type: "module"`, no build step
- Pure `node:http` server on `127.0.0.1:8787` (override with `PORT`)
- Accepts POST to any path, writes JSON body to `docs/hook-event-samples/<iso-ts>-<event>.json`
- Event name is taken from `hook_event_name` in the payload, falling back to the URL path
- Devtime deps: `tsx`, `typescript`, `@types/node`. No production deps yet.

Bound to `127.0.0.1` only — never a public listener, even momentarily.

## Why apps/bridge over throwaway

- We're going to build the bridge daemon in Phase 1 anyway. Starting it now with the cheapest possible code (~70 lines) costs nothing extra.
- The Phase 0 captures live next to the code that produced them, so the eventual transcript-parser / Convex forwarder has a natural home and a record of what shapes we built against.
- A workspace package means `pnpm install` / `pnpm typecheck` exercise the monorepo wiring — small validation of 0.1's scaffolding for free.

The cost is a slightly heavier setup than a one-off `.ts` file. Acceptable.

## Consequences

- `package.json` `packageManager` field was bumped from `pnpm@9.12.0` to `pnpm@10.15.1` to match the installed pnpm and avoid corepack downloads. We're not pinned to 9 for any reason.
- `apps/bridge/` is now a real workspace package; future bridge work extends it instead of replacing it.
- `docs/hook-event-samples/` is committed (with `.gitkeep`) so captured payloads can be reviewed in PRs / shared across machines. We will scrub any sensitive paths/secrets before committing real captures.

## Verification

Server started via `pnpm --filter @lilbuddy/bridge capture`, smoke-tested with:

```sh
curl -X POST http://127.0.0.1:8787/SmokeTest \
  -H 'Content-Type: application/json' \
  -d '{"hook_event_name":"SmokeTest","ok":true,"note":"capture server liveness check"}'
```

Resulting file: `docs/hook-event-samples/2026-05-27T19-52-26-846Z-SmokeTest.json` — payload preserved verbatim, filename derived from `hook_event_name`. Path through the system works.

## Open questions for later phases

- Does the capture server need request-level auth once it talks to real device sessions? (Phase 1+: yes — token in header.)
- Do we keep this disk-write path as a debug-only fallback after Convex forwarding lands? Probably.
