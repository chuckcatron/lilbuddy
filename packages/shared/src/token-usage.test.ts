import { describe, expect, it } from "vitest";

import { addTokenUsage, hasTokens, parseTranscriptUsage, totalTokens } from "./token-usage.js";
import { EMPTY_TOKEN_USAGE } from "./session-state.js";
import type { TokenUsage } from "./session-state.js";

describe("addTokenUsage", () => {
  it("sums all four fields", () => {
    const a: TokenUsage = {
      cacheCreationInputTokens: 10,
      cacheReadInputTokens: 20,
      inputTokens: 100,
      outputTokens: 50,
    };
    const b: TokenUsage = {
      cacheCreationInputTokens: 5,
      cacheReadInputTokens: 15,
      inputTokens: 200,
      outputTokens: 75,
    };
    expect(addTokenUsage(a, b)).toEqual({
      cacheCreationInputTokens: 15,
      cacheReadInputTokens: 35,
      inputTokens: 300,
      outputTokens: 125,
    });
  });

  it("returns incoming when current is empty", () => {
    const incoming: TokenUsage = {
      cacheCreationInputTokens: 1,
      cacheReadInputTokens: 2,
      inputTokens: 3,
      outputTokens: 4,
    };
    expect(addTokenUsage(EMPTY_TOKEN_USAGE, incoming)).toEqual(incoming);
  });

  it("returns current when incoming is empty", () => {
    const current: TokenUsage = {
      cacheCreationInputTokens: 10,
      cacheReadInputTokens: 20,
      inputTokens: 30,
      outputTokens: 40,
    };
    expect(addTokenUsage(current, EMPTY_TOKEN_USAGE)).toEqual(current);
  });

  it("returns all zeros when both are empty", () => {
    expect(addTokenUsage(EMPTY_TOKEN_USAGE, EMPTY_TOKEN_USAGE)).toEqual(EMPTY_TOKEN_USAGE);
  });
});

describe("totalTokens", () => {
  it("returns sum of inputTokens and outputTokens", () => {
    expect(
      totalTokens({
        cacheCreationInputTokens: 100,
        cacheReadInputTokens: 200,
        inputTokens: 500,
        outputTokens: 300,
      }),
    ).toBe(800);
  });

  it("ignores cache fields", () => {
    expect(
      totalTokens({
        cacheCreationInputTokens: 999,
        cacheReadInputTokens: 999,
        inputTokens: 0,
        outputTokens: 0,
      }),
    ).toBe(0);
  });

  it("returns zero for empty usage", () => {
    expect(totalTokens(EMPTY_TOKEN_USAGE)).toBe(0);
  });
});

describe("parseTranscriptUsage", () => {
  it("maps snake_case keys to camelCase fields", () => {
    expect(
      parseTranscriptUsage({
        cache_creation_input_tokens: 10,
        cache_read_input_tokens: 20,
        input_tokens: 100,
        output_tokens: 50,
      }),
    ).toEqual({
      cacheCreationInputTokens: 10,
      cacheReadInputTokens: 20,
      inputTokens: 100,
      outputTokens: 50,
    });
  });

  it("defaults missing fields to 0", () => {
    expect(parseTranscriptUsage({})).toEqual(EMPTY_TOKEN_USAGE);
  });

  it("defaults partially missing fields to 0", () => {
    expect(
      parseTranscriptUsage({
        input_tokens: 42,
      }),
    ).toEqual({
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      inputTokens: 42,
      outputTokens: 0,
    });
  });

  it("defaults non-number values to 0", () => {
    expect(
      parseTranscriptUsage({
        cache_creation_input_tokens: "not a number",
        cache_read_input_tokens: null,
        input_tokens: true,
        output_tokens: undefined,
      }),
    ).toEqual(EMPTY_TOKEN_USAGE);
  });

  it("defaults NaN to 0", () => {
    expect(
      parseTranscriptUsage({
        input_tokens: NaN,
        output_tokens: Infinity,
      }),
    ).toEqual(EMPTY_TOKEN_USAGE);
  });
});

describe("hasTokens", () => {
  it("returns false for empty usage", () => {
    expect(hasTokens(EMPTY_TOKEN_USAGE)).toBe(false);
  });

  it("returns true when inputTokens > 0", () => {
    expect(
      hasTokens({
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        inputTokens: 1,
        outputTokens: 0,
      }),
    ).toBe(true);
  });

  it("returns true when outputTokens > 0", () => {
    expect(
      hasTokens({
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        inputTokens: 0,
        outputTokens: 1,
      }),
    ).toBe(true);
  });

  it("returns false when only cache tokens are present", () => {
    expect(
      hasTokens({
        cacheCreationInputTokens: 100,
        cacheReadInputTokens: 200,
        inputTokens: 0,
        outputTokens: 0,
      }),
    ).toBe(false);
  });
});
