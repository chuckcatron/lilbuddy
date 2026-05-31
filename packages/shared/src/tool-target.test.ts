import { describe, expect, it } from "vitest";

import { extractToolTarget } from "./tool-target.js";

describe("extractToolTarget", () => {
  describe("known tool types", () => {
    it("returns file_path for Read", () => {
      expect(extractToolTarget("Read", { file_path: "/src/index.ts" })).toBe("/src/index.ts");
    });

    it("returns file_path for Write", () => {
      expect(extractToolTarget("Write", { file_path: "/src/out.ts" })).toBe("/src/out.ts");
    });

    it("returns file_path for Edit", () => {
      expect(extractToolTarget("Edit", { file_path: "/src/fix.ts" })).toBe("/src/fix.ts");
    });

    it("returns pattern for Glob", () => {
      expect(extractToolTarget("Glob", { pattern: "**/*.ts" })).toBe("**/*.ts");
    });

    it("returns pattern for Grep", () => {
      expect(extractToolTarget("Grep", { pattern: "TODO" })).toBe("TODO");
    });

    it("returns command for Bash", () => {
      expect(extractToolTarget("Bash", { command: "npm test" })).toBe("npm test");
    });

    it("returns url for WebFetch", () => {
      expect(extractToolTarget("WebFetch", { url: "https://example.com" })).toBe(
        "https://example.com",
      );
    });

    it("returns query for ToolSearch", () => {
      expect(extractToolTarget("ToolSearch", { query: "notebook" })).toBe("notebook");
    });

    it("returns prompt for Agent, truncated to 120 chars", () => {
      const shortPrompt = "investigate the bug";
      expect(extractToolTarget("Agent", { prompt: shortPrompt })).toBe(shortPrompt);

      const longPrompt = "a".repeat(200);
      const result = extractToolTarget("Agent", { prompt: longPrompt });
      expect(result).toHaveLength(120);
      expect(result).toBe("a".repeat(119) + "…");
    });
  });

  describe("unknown tool fallback", () => {
    it("returns file_path when present on unknown tool", () => {
      expect(extractToolTarget("CustomTool", { file_path: "/custom/path" })).toBe("/custom/path");
    });

    it("returns path when file_path is absent", () => {
      expect(extractToolTarget("CustomTool", { path: "/other/path" })).toBe("/other/path");
    });

    it("returns url when file_path and path are absent", () => {
      expect(extractToolTarget("CustomTool", { url: "https://api.test" })).toBe("https://api.test");
    });

    it("returns command when earlier fallbacks are absent", () => {
      expect(extractToolTarget("CustomTool", { command: "ls -la" })).toBe("ls -la");
    });

    it("returns query when earlier fallbacks are absent", () => {
      expect(extractToolTarget("CustomTool", { query: "search term" })).toBe("search term");
    });

    it("returns undefined when no recognized keys exist", () => {
      expect(extractToolTarget("CustomTool", { foo: "bar" })).toBeUndefined();
    });

    it("returns undefined for empty input", () => {
      expect(extractToolTarget("CustomTool", {})).toBeUndefined();
    });
  });

  describe("non-string values", () => {
    it("returns undefined when file_path is a number", () => {
      expect(extractToolTarget("Read", { file_path: 42 })).toBeUndefined();
    });

    it("returns undefined when file_path is null", () => {
      expect(extractToolTarget("Read", { file_path: null })).toBeUndefined();
    });

    it("returns undefined when file_path is boolean", () => {
      expect(extractToolTarget("Read", { file_path: true })).toBeUndefined();
    });

    it("returns undefined when prompt is missing for Agent", () => {
      expect(extractToolTarget("Agent", {})).toBeUndefined();
    });
  });

  describe("fallback priority", () => {
    it("prefers file_path over path on unknown tool", () => {
      expect(
        extractToolTarget("CustomTool", { file_path: "/first", path: "/second" }),
      ).toBe("/first");
    });

    it("skips non-string file_path and falls back to path", () => {
      expect(
        extractToolTarget("CustomTool", { file_path: 123, path: "/fallback" }),
      ).toBe("/fallback");
    });
  });
});
