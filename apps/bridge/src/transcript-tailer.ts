import { type FileHandle, open } from "node:fs/promises";
import { type Stats, statSync, unwatchFile, watchFile } from "node:fs";

import type { TokenUsage } from "@lilbuddy/shared";
import { EMPTY_TOKEN_USAGE, addTokenUsage, parseTranscriptUsage } from "@lilbuddy/shared";

// ---------------------------------------------------------------------------
// TranscriptTailer — watches a JSONL transcript file for token usage
// ---------------------------------------------------------------------------

export type TokenUpdateCallback = (tokens: TokenUsage) => void;
export type ModelUpdateCallback = (model: string) => void;

export class TranscriptTailer {
  readonly #path: string;
  readonly #onTokens: TokenUpdateCallback;
  readonly #onModel: ModelUpdateCallback | undefined;
  #offset = 0;
  #partialLine = "";
  #accumulated: TokenUsage = EMPTY_TOKEN_USAGE;
  #model: string | undefined;
  #watching = false;
  #waitTimer: ReturnType<typeof setTimeout> | undefined;
  #fileHandle: FileHandle | undefined;

  constructor(path: string, onTokens: TokenUpdateCallback, onModel?: ModelUpdateCallback) {
    this.#path = path;
    this.#onTokens = onTokens;
    this.#onModel = onModel;
  }

  get accumulated(): TokenUsage {
    return this.#accumulated;
  }

  get isWatching(): boolean {
    return this.#watching;
  }

  start(): void {
    if (this.#watching) return;
    this.#watching = true;
    this.#waitForFile();
  }

  async stop(): Promise<void> {
    this.#watching = false;

    if (this.#waitTimer !== undefined) {
      clearTimeout(this.#waitTimer);
      this.#waitTimer = undefined;
    }

    unwatchFile(this.#path);

    if (this.#fileHandle) {
      await this.#fileHandle.close();
      this.#fileHandle = undefined;
    }
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  #waitForFile(): void {
    if (!this.#watching) return;

    if (this.#fileExists()) {
      this.#beginWatching();
      return;
    }

    this.#waitTimer = setTimeout(() => this.#waitForFile(), 500);
  }

  #fileExists(): boolean {
    try {
      statSync(this.#path);
      return true;
    } catch {
      return false;
    }
  }

  #beginWatching(): void {
    watchFile(this.#path, { interval: 500 }, (_curr: Stats, _prev: Stats) => {
      void this.#readNewBytes();
    });

    // Read any bytes already in the file
    void this.#readNewBytes();
  }

  async #readNewBytes(): Promise<void> {
    if (!this.#watching) return;

    try {
      if (!this.#fileHandle) {
        this.#fileHandle = await open(this.#path, "r");
      }

      const stat = await this.#fileHandle.stat();
      const size = stat.size;

      if (size <= this.#offset) return;

      const bytesToRead = size - this.#offset;
      const buffer = Buffer.alloc(bytesToRead);
      await this.#fileHandle.read(buffer, 0, bytesToRead, this.#offset);
      this.#offset = size;

      const text = this.#partialLine + buffer.toString("utf8");
      const lines = text.split("\n");

      // Last element is either empty (line ended with \n) or a partial line
      this.#partialLine = lines.pop() ?? "";

      let updated = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parsed = this.#parseAssistantLine(trimmed);
        if (!parsed) continue;

        if (parsed.model && this.#model === undefined) {
          this.#model = parsed.model;
          this.#onModel?.(parsed.model);
        }

        if (parsed.usage) {
          this.#accumulated = addTokenUsage(this.#accumulated, parsed.usage);
          updated = true;
        }
      }

      if (updated) {
        this.#onTokens(this.#accumulated);
      }
    } catch {
      // File may have been deleted or become inaccessible — ignore and retry on next poll
    }
  }

  #parseAssistantLine(jsonLine: string): { model?: string; usage?: TokenUsage } | undefined {
    try {
      const record = JSON.parse(jsonLine) as Record<string, unknown>;

      if (record["type"] !== "assistant") return undefined;

      const message = record["message"];
      if (typeof message !== "object" || message === null) return undefined;

      const messageObj = message as Record<string, unknown>;
      const result: { model?: string; usage?: TokenUsage } = {};

      const model = messageObj["model"];
      if (typeof model === "string" && model.length > 0) {
        result.model = model;
      }

      const usage = messageObj["usage"];
      if (typeof usage === "object" && usage !== null) {
        result.usage = parseTranscriptUsage(usage as Record<string, unknown>);
      }

      return result;
    } catch {
      return undefined;
    }
  }
}
