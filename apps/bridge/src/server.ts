import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { HookPayload } from "@lilbuddy/shared";

// ---------------------------------------------------------------------------
// BridgeServer — HTTP server that receives Claude Code hook events
// ---------------------------------------------------------------------------

const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MiB

export type EventCallback = (event: HookPayload) => void;

export interface BridgeServerOptions {
  readonly host?: string;
  readonly onEvent: EventCallback;
  readonly port?: number;
}

export class BridgeServer {
  readonly #host: string;
  readonly #onEvent: EventCallback;
  readonly #port: number;
  readonly #server: Server;

  constructor(options: BridgeServerOptions) {
    this.#host = options.host ?? "127.0.0.1";
    this.#onEvent = options.onEvent;
    this.#port = options.port ?? 8787;
    this.#server = createServer((req, res) => {
      this.#handle(req, res).catch((err: unknown) => {
        console.error("[bridge] handler error:", err);
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
    });
  }

  get port(): number {
    return this.#port;
  }

  async start(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.#server.listen(this.#port, this.#host, () => {
        console.log(`[bridge] listening on http://${this.#host}:${this.#port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.#server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async #handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== "POST") {
      res.writeHead(405, { Allow: "POST" });
      res.end("POST only\n");
      return;
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for await (const chunk of req) {
      totalBytes += (chunk as Buffer).byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        res.writeHead(413);
        res.end("Payload too large\n");
        req.destroy();
        return;
      }
      chunks.push(chunk as Buffer);
    }
    const raw = Buffer.concat(chunks).toString("utf8");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Invalid JSON — acknowledge but don't process
      res.writeHead(204);
      res.end();
      return;
    }

    if (isHookPayload(parsed)) {
      this.#onEvent(parsed);
    }

    res.writeHead(204);
    res.end();
  }
}

// ---------------------------------------------------------------------------
// Runtime type guard — validates minimum shape before casting
// ---------------------------------------------------------------------------

function isHookPayload(value: unknown): value is HookPayload {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj["hook_event_name"] === "string" &&
    typeof obj["session_id"] === "string" &&
    typeof obj["cwd"] === "string" &&
    typeof obj["transcript_path"] === "string"
  );
}
