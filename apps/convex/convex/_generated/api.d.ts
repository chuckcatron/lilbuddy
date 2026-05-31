/**
 * Generated API type — manually created until Convex deployment is configured.
 * Run `npx convex codegen` to regenerate once a deployment exists.
 */
import type { FunctionReference } from "convex/server";
import type { Doc } from "./dataModel.js";

export declare const api: {
  sessions: {
    getActive: FunctionReference<"query", "public", Record<string, never>, Doc<"sessions">[]>;
    getById: FunctionReference<
      "query",
      "public",
      { sessionId: string },
      Doc<"sessions"> | null
    >;
    upsert: FunctionReference<
      "mutation",
      "public",
      {
        sessionId: string;
        userId: string;
        model: string;
        cwd: string;
        currentTool?: string;
        currentTarget?: string;
        notificationState: string;
        notificationMessage?: string;
        inputTokens: number;
        outputTokens: number;
        cacheCreationInputTokens: number;
        cacheReadInputTokens: number;
        lastAssistantMessage?: string;
        permissionMode: string;
        isActive: boolean;
        startedAt: number;
        updatedAt: number;
      },
      string
    >;
    markEnded: FunctionReference<"mutation", "public", { sessionId: string }, void>;
  };
};

export declare const internal: Record<string, Record<string, FunctionReference<"query" | "mutation" | "action">>>;
