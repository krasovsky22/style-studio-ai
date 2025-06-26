import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Log user action
export const logUserAction = mutation({
  args: {
    userId: v.id("users"),
    action: v.union(
      v.literal("generation_started"),
      v.literal("generation_completed"),
      v.literal("generation_failed"),
      v.literal("image_uploaded"),
      v.literal("image_downloaded"),
      v.literal("tokens_purchased"),
      v.literal("login"),
      v.literal("logout")
    ),
    metadata: v.optional(
      v.object({
        generationId: v.optional(v.id("generations")),
        tokenPurchaseId: v.optional(v.id("tokenPurchases")),
        tokensUsed: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
        processingTime: v.optional(v.number()),
        modelUsed: v.optional(v.string()),
        imageSize: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        reason: v.optional(v.string()),
        transactionType: v.optional(
          v.union(v.literal("debit"), v.literal("credit"))
        ),
        balanceAfter: v.optional(v.number()),
        refund: v.optional(v.boolean()),
      })
    ),
    ipAddress: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const usageId = await ctx.db.insert("usage", {
      userId: args.userId,
      action: args.action,
      timestamp: Date.now(),
      metadata: args.metadata,
      ipAddress: args.ipAddress,
      sessionId: args.sessionId,
    });

    return usageId;
  },
});

// Get user's usage history
export const getUserUsageHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    action: v.optional(
      v.union(
        v.literal("generation_started"),
        v.literal("generation_completed"),
        v.literal("generation_failed"),
        v.literal("image_uploaded"),
        v.literal("image_downloaded"),
        v.literal("tokens_purchased"),
        v.literal("login"),
        v.literal("logout")
      )
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("usage")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (args.action) {
      query = ctx.db
        .query("usage")
        .withIndex("by_user_and_action", (q) =>
          q.eq("userId", args.userId).eq("action", args.action!)
        )
        .order("desc");
    }

    const limit = args.limit || 50;
    return await query.take(limit);
  },
});
