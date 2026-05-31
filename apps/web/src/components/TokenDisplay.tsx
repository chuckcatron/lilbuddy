import type { TokenUsage } from "@lilbuddy/shared";
import { totalTokens } from "@lilbuddy/shared";

interface TokenDisplayProps {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
}

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toLocaleString();
}

export function TokenDisplay(props: TokenDisplayProps): React.ReactElement {
  const usage: TokenUsage = {
    cacheCreationInputTokens: props.cacheCreationInputTokens,
    cacheReadInputTokens: props.cacheReadInputTokens,
    inputTokens: props.inputTokens,
    outputTokens: props.outputTokens,
  };

  const total = totalTokens(usage);

  return (
    <span className="font-mono text-sm text-neutral-400" data-testid="token-display">
      {formatTokenCount(total)} tokens
    </span>
  );
}
