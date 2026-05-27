/**
 * Token math helpers. Phase 1 uses simple input+output totals.
 * Phase 2 adds cache-aware cost estimation.
 */

import type { TokenUsage } from "./session-state.js";

/**
 * Accumulate a new usage record onto existing totals.
 * Used by the transcript tailer to build running sums.
 */
export function addTokenUsage(current: TokenUsage, incoming: TokenUsage): TokenUsage {
  return {
    cacheCreationInputTokens:
      current.cacheCreationInputTokens + incoming.cacheCreationInputTokens,
    cacheReadInputTokens: current.cacheReadInputTokens + incoming.cacheReadInputTokens,
    inputTokens: current.inputTokens + incoming.inputTokens,
    outputTokens: current.outputTokens + incoming.outputTokens,
  };
}

/**
 * Total tokens consumed (Phase 1 simple view: input + output).
 */
export function totalTokens(usage: TokenUsage): number {
  return usage.inputTokens + usage.outputTokens;
}

/**
 * Parse the `message.usage` object from a transcript JSONL assistant record
 * into our TokenUsage shape. Returns zeros for missing fields.
 */
export function parseTranscriptUsage(raw: Record<string, unknown>): TokenUsage {
  return {
    cacheCreationInputTokens: asNumber(raw["cache_creation_input_tokens"]),
    cacheReadInputTokens: asNumber(raw["cache_read_input_tokens"]),
    inputTokens: asNumber(raw["input_tokens"]),
    outputTokens: asNumber(raw["output_tokens"]),
  };
}

/**
 * Type guard: is this a valid TokenUsage with at least some tokens?
 */
export function hasTokens(usage: TokenUsage): boolean {
  return totalTokens(usage) > 0;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
