# lil' buddy

> Claude does the work, lil' buddy lets you know how it's going.

A small e-ink desk display and USB-HID control surface for Claude Code agents.

## Repo layout

- `apps/web/` — Next.js dashboard (Vercel)
- `apps/bridge/` — Node/TypeScript daemon that listens to Claude Code hooks and forwards to Convex
- `packages/shared/` — shared types and utilities
- `firmware/` — ESP32-S3 firmware (LilyGO T5 4.7" e-paper)
- `docs/` — design notes, hook payload samples, phase findings

## Requirements

- Node 22 (see `.nvmrc`)
- pnpm 9+

## Getting started

```sh
pnpm install
pnpm dev
```
