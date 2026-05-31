import { httpRouter, makeFunctionReference } from "convex/server";

import { httpAction } from "./_generated/server.js";

const http = httpRouter();

interface BridgeUpdateBody {
  sessionId: string;
  userId?: string;
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
}

function isBridgeUpdateBody(value: unknown): value is BridgeUpdateBody {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj["sessionId"] === "string" &&
    typeof obj["model"] === "string" &&
    typeof obj["cwd"] === "string" &&
    typeof obj["notificationState"] === "string" &&
    typeof obj["inputTokens"] === "number" &&
    typeof obj["outputTokens"] === "number" &&
    typeof obj["cacheCreationInputTokens"] === "number" &&
    typeof obj["cacheReadInputTokens"] === "number" &&
    typeof obj["permissionMode"] === "string" &&
    typeof obj["isActive"] === "boolean" &&
    typeof obj["startedAt"] === "number" &&
    typeof obj["updatedAt"] === "number"
  );
}

const upsertRef = makeFunctionReference<"mutation">("sessions:upsert");

http.route({
  path: "/api/bridge/update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = process.env.BRIDGE_API_KEY;
    if (!apiKey) {
      return new Response("Server misconfigured: BRIDGE_API_KEY not set", {
        status: 500,
      });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Missing or malformed Authorization header", {
        status: 401,
      });
    }

    const token = authHeader.slice("Bearer ".length);
    if (token !== apiKey) {
      return new Response("Invalid API key", { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }

    if (!isBridgeUpdateBody(body)) {
      return new Response("Invalid session state payload", { status: 400 });
    }

    await ctx.runMutation(upsertRef, {
      ...body,
      userId: body.userId ?? "",
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
