import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { HookPayload } from "@lilbuddy/shared";

// ---------------------------------------------------------------------------
// BridgeServer — HTTP server that receives Claude Code hook events
// ---------------------------------------------------------------------------

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
    for await (const chunk of req) chunks.push(chunk as Buffer);
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

    if (parsed && typeof parsed === "object" && "hook_event_name" in parsed) {
      this.#onEvent(parsed as HookPayload);
    }

    res.writeHead(204);
    res.end();
  }
}
