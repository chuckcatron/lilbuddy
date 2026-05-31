import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TokenDisplay } from "./TokenDisplay";

describe("TokenDisplay", () => {
  it("renders total tokens (input + output)", () => {
    render(
      <TokenDisplay
        inputTokens={1000}
        outputTokens={500}
        cacheCreationInputTokens={0}
        cacheReadInputTokens={0}
      />,
    );

    expect(screen.getByTestId("token-display")).toHaveTextContent("1.5k tokens");
  });

  it("renders small token counts without abbreviation", () => {
    render(
      <TokenDisplay
        inputTokens={100}
        outputTokens={50}
        cacheCreationInputTokens={0}
        cacheReadInputTokens={0}
      />,
    );

    expect(screen.getByTestId("token-display")).toHaveTextContent("150 tokens");
  });

  it("renders million-scale token counts with M suffix", () => {
    render(
      <TokenDisplay
        inputTokens={1_500_000}
        outputTokens={500_000}
        cacheCreationInputTokens={0}
        cacheReadInputTokens={0}
      />,
    );

    expect(screen.getByTestId("token-display")).toHaveTextContent("2.0M tokens");
  });

  it("sums only input and output for total (not cache tokens)", () => {
    render(
      <TokenDisplay
        inputTokens={500}
        outputTokens={300}
        cacheCreationInputTokens={10000}
        cacheReadInputTokens={20000}
      />,
    );

    expect(screen.getByTestId("token-display")).toHaveTextContent("800 tokens");
  });

  it("renders zero tokens", () => {
    render(
      <TokenDisplay
        inputTokens={0}
        outputTokens={0}
        cacheCreationInputTokens={0}
        cacheReadInputTokens={0}
      />,
    );

    expect(screen.getByTestId("token-display")).toHaveTextContent("0 tokens");
  });
});
