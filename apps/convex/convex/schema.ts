import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    sessionId: v.string(),
    userId: v.string(),
    model: v.string(),
    cwd: v.string(),
    currentTool: v.optional(v.string()),
    currentTarget: v.optional(v.string()),
    notificationState: v.string(), // "none" | "permission_prompt" | "idle_prompt"
    notificationMessage: v.optional(v.string()),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cacheCreationInputTokens: v.number(),
    cacheReadInputTokens: v.number(),
    lastAssistantMessage: v.optional(v.string()),
    permissionMode: v.string(),
    isActive: v.boolean(),
    startedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_userId_isActive", ["userId", "isActive"]),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),
  }),

  devices: defineTable({
    userId: v.string(),
    deviceId: v.string(),
    firmwareVersion: v.string(),
    lastSeen: v.number(),
    isPaired: v.boolean(),
  }),
});
