import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { HookPayload } from "@lilbuddy/shared";

import { Forwarder } from "./forwarder.js";
import { BridgeServer } from "./server.js";
import { SessionStore } from "./session-store.js";
import { TranscriptTailer } from "./transcript-tailer.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT ?? 8787);
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL ?? "";
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY ?? "";
const BRIDGE_USER_ID = process.env.BRIDGE_USER_ID ?? "";
const CAPTURE_MODE =
  process.argv.includes("--capture") ||
  process.env.CAPTURE_MODE === "true";

// ---------------------------------------------------------------------------
// Capture mode — disk writer (preserves Phase 0 behavior)
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, "../../../docs/hook-event-samples");

function safeName(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 64) || "unknown";
}

async function captureToFile(event: HookPayload): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const eventName = safeName(event.hook_event_name);
  const ts = new Date()
    .toISOString()
    .replace(/[:]/g, "-")
    .replace(/\.(\d+)Z$/, "-$1Z");
  const filename = `${ts}-${eventName}.json`;
  const filepath = join(OUT_DIR, filename);

  await writeFile(filepath, JSON.stringify(event, null, 2) + "\n", "utf8");
  console.log(`[capture] ${eventName} -> ${filename}`);
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

const store = new SessionStore();
const tailers = new Map<string, TranscriptTailer>();

function onEvent(event: HookPayload): void {
  store.apply(event);

  // Start a transcript tailer the first time we see any session with a
  // transcript path — not just on SessionStart. Adopting mid-session lets the
  // bridge backfill token usage AND the model (read from the transcript) for
  // sessions that were already running when the bridge started.
  if (event.transcript_path && !tailers.has(event.session_id)) {
    const { session_id: sessionId } = event;
    const tailer = new TranscriptTailer(
      event.transcript_path,
      (tokens) => store.updateTokens(sessionId, tokens),
      (model) => store.updateModel(sessionId, model),
    );
    tailers.set(sessionId, tailer);
    tailer.start();
  }

  // Stop transcript tailer on SessionEnd
  if (event.hook_event_name === "SessionEnd") {
    const tailer = tailers.get(event.session_id);
    if (tailer) {
      void tailer.stop();
      tailers.delete(event.session_id);
    }
  }

  // Capture to disk in capture mode
  if (CAPTURE_MODE) {
    void captureToFile(event);
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const server = new BridgeServer({ onEvent, port: PORT });

// Start forwarder if Convex is configured
const forwarder =
  CONVEX_SITE_URL && BRIDGE_API_KEY
    ? new Forwarder({
        apiKey: BRIDGE_API_KEY,
        convexUrl: CONVEX_SITE_URL,
        store,
        userId: BRIDGE_USER_ID,
      })
    : null;

if (forwarder) {
  forwarder.start();
} else {
  console.warn("[bridge] CONVEX_SITE_URL or BRIDGE_API_KEY not set — forwarding disabled");
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  forwarder?.stop();
  for (const tailer of tailers.values()) {
    await tailer.stop();
  }
  tailers.clear();
  await server.stop();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());

if (CAPTURE_MODE) {
  console.log(`[bridge] capture mode enabled — writing to ${OUT_DIR}`);
}

await server.start();
