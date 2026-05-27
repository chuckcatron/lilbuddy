/**
 * Extract the "target" (file path, URL, pattern, etc.) from a tool invocation.
 * Derived from ADR 0004 signal analysis — field mapping per tool_name.
 */

import type { ToolName } from "./hook-events.js";

/**
 * Given a tool name and its input object, return the most meaningful
 * "what is Claude acting on?" string — a file path, URL, search pattern,
 * or shell command. Returns `undefined` if no target can be extracted.
 */
export function extractToolTarget(
  toolName: ToolName,
  toolInput: Record<string, unknown>,
): string | undefined {
  switch (toolName) {
    case "Read":
    case "Write":
    case "Edit":
      return asString(toolInput["file_path"]);

    case "Glob":
      return asString(toolInput["pattern"]);

    case "Grep":
      return asString(toolInput["pattern"]);

    case "Bash":
      return asString(toolInput["command"]);

    case "WebFetch":
      return asString(toolInput["url"]);

    case "Agent":
      return truncate(asString(toolInput["prompt"]), 120);

    case "ToolSearch":
      return asString(toolInput["query"]);

    default:
      // Unknown tool — try common field names
      return (
        asString(toolInput["file_path"]) ??
        asString(toolInput["path"]) ??
        asString(toolInput["url"]) ??
        asString(toolInput["command"]) ??
        asString(toolInput["query"])
      );
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function truncate(value: string | undefined, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 1) + "…";
}
