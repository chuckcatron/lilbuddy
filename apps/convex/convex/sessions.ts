import { v } from "convex/values";

import { mutation, query } from "./_generated/server.js";

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getById = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    sessionId: v.string(),
    userId: v.string(),
    model: v.string(),
    cwd: v.string(),
    currentTool: v.optional(v.string()),
    currentTarget: v.optional(v.string()),
    notificationState: v.string(),
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("sessions", args);
  },
});

export const markEnded = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    await ctx.db.patch(session._id, { isActive: false });
  },
});
