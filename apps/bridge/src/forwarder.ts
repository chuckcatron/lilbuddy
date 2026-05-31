import type { SessionState } from "@lilbuddy/shared";

import type { SessionStore } from "./session-store.js";

// ---------------------------------------------------------------------------
// BridgeUpdateBody — matches the Convex HTTP endpoint contract
// ---------------------------------------------------------------------------

interface BridgeUpdateBody {
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly currentTarget?: string;
  readonly currentTool?: string;
  readonly cwd: string;
  readonly inputTokens: number;
  readonly isActive: boolean;
  readonly lastAssistantMessage?: string;
  readonly model: string;
  readonly notificationMessage?: string;
  readonly notificationState: string;
  readonly outputTokens: number;
  readonly permissionMode: string;
  readonly sessionId: string;
  readonly startedAt: number;
  readonly updatedAt: number;
  readonly userId: string;
}

// ---------------------------------------------------------------------------
// Forwarder — debounces session state and POSTs to Convex
// ---------------------------------------------------------------------------

export interface ForwarderOptions {
  readonly apiKey: string;
  readonly convexUrl: string;
  readonly debounceMs?: number;
  readonly maxRetries?: number;
  readonly store: SessionStore;
  readonly userId?: string;
}

export class Forwarder {
  readonly #apiKey: string;
  readonly #convexUrl: string;
  readonly #debounceMs: number;
  readonly #listener: (state: SessionState) => void;
  readonly #maxRetries: number;
  readonly #store: SessionStore;
  readonly #timers = new Map<string, ReturnType<typeof setTimeout>>();
  readonly #userId: string;

  constructor(options: ForwarderOptions) {
    this.#apiKey = options.apiKey;
    this.#convexUrl = options.convexUrl;
    this.#debounceMs = options.debounceMs ?? 100;
    this.#maxRetries = options.maxRetries ?? 3;
    this.#store = options.store;
    this.#userId = options.userId ?? "";
    this.#listener = (state: SessionState) => this.#onStateChanged(state);
  }

  start(): void {
    this.#store.on("stateChanged", this.#listener);
    console.log(`[forwarder] forwarding to ${this.#convexUrl}/api/bridge/update`);
  }

  stop(): void {
    this.#store.off("stateChanged", this.#listener);
    for (const timer of this.#timers.values()) {
      clearTimeout(timer);
    }
    this.#timers.clear();
  }

  #onStateChanged(state: SessionState): void {
    const existing = this.#timers.get(state.sessionId);
    if (existing !== undefined) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.#timers.delete(state.sessionId);
      void this.#forward(state);
    }, this.#debounceMs);

    this.#timers.set(state.sessionId, timer);
  }

  async #forward(state: SessionState): Promise<void> {
    const body = this.#toBody(state);
    const url = `${this.#convexUrl}/api/bridge/update`;

    for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          body: JSON.stringify(body),
          headers: {
            Authorization: `Bearer ${this.#apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (res.ok) return;

        console.error(
          `[forwarder] POST failed (${res.status}) attempt ${attempt + 1}/${this.#maxRetries + 1}`,
        );
      } catch (err: unknown) {
        console.error(
          `[forwarder] POST error attempt ${attempt + 1}/${this.#maxRetries + 1}:`,
          err,
        );
      }

      if (attempt < this.#maxRetries) {
        const delay = 1000 * 2 ** attempt; // 1s, 2s, 4s
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }

    console.error(`[forwarder] giving up on session ${state.sessionId} after ${this.#maxRetries + 1} attempts`);
  }

  #toBody(state: SessionState): BridgeUpdateBody {
    return {
      cacheCreationInputTokens: state.tokens.cacheCreationInputTokens,
      cacheReadInputTokens: state.tokens.cacheReadInputTokens,
      currentTarget: state.currentTarget,
      currentTool: state.currentTool,
      cwd: state.cwd,
      inputTokens: state.tokens.inputTokens,
      isActive: state.isActive,
      lastAssistantMessage: state.lastAssistantMessage,
      model: state.model,
      notificationMessage:
        state.notificationState.type === "none"
          ? undefined
          : state.notificationState.message,
      notificationState: state.notificationState.type,
      outputTokens: state.tokens.outputTokens,
      permissionMode: state.permissionMode,
      sessionId: state.sessionId,
      startedAt: state.startedAt,
      updatedAt: state.updatedAt,
      userId: this.#userId,
    };
  }
}
