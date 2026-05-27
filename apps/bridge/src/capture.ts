import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 8787);
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, "../../../docs/hook-event-samples");

await mkdir(OUT_DIR, { recursive: true });

function safeName(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 64) || "unknown";
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    res.writeHead(405, { Allow: "POST" });
    res.end("POST only\n");
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");

  const urlEvent = safeName((req.url ?? "/").replace(/^\/+/, "").split("?")[0] ?? "");
  let parsed: unknown = raw;
  let payloadEvent: string | undefined;
  try {
    parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "hook_event_name" in parsed) {
      const v = (parsed as Record<string, unknown>).hook_event_name;
      if (typeof v === "string") payloadEvent = safeName(v);
    }
  } catch {
    // Keep as raw string — we'll save what we got.
  }

  const event = payloadEvent || urlEvent || "unknown";
  const ts = new Date().toISOString().replace(/[:]/g, "-").replace(/\.(\d+)Z$/, "-$1Z");
  const filename = `${ts}-${event}.json`;
  const filepath = join(OUT_DIR, filename);

  const body = typeof parsed === "string"
    ? JSON.stringify({ _raw: parsed }, null, 2)
    : JSON.stringify(parsed, null, 2);

  await writeFile(filepath, body + "\n", "utf8");
  console.log(`[capture] ${event}  (${raw.length}B) -> ${filename}`);

  res.writeHead(204);
  res.end();
}

const server = createServer((req, res) => {
  handle(req, res).catch((err: unknown) => {
    console.error("[capture] handler error:", err);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[capture] listening on http://127.0.0.1:${PORT}`);
  console.log(`[capture] writing samples to ${OUT_DIR}`);
});
