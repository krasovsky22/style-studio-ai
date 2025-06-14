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

// Get usage analytics for a date range
export const getUsageAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("usage")
      .withIndex("by_timestamp")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startDate),
          q.lte(q.field("timestamp"), args.endDate)
        )
      );

    if (args.userId) {
      query = ctx.db
        .query("usage")
        .withIndex("by_user_and_timestamp", (q) => q.eq("userId", args.userId!))
        .filter((q) =>
          q.and(
            q.gte(q.field("timestamp"), args.startDate),
            q.lte(q.field("timestamp"), args.endDate)
          )
        );
    }

    const usageData = await query.collect();

    // Aggregate data by action type
    const analytics = {
      totalActions: usageData.length,
      actionBreakdown: {} as Record<string, number>,
      uniqueUsers: new Set<string>(),
      dailyBreakdown: {} as Record<string, number>,
    };

    usageData.forEach((usage) => {
      // Count by action type
      analytics.actionBreakdown[usage.action] =
        (analytics.actionBreakdown[usage.action] || 0) + 1;

      // Count unique users
      analytics.uniqueUsers.add(usage.userId);

      // Daily breakdown
      const date = new Date(usage.timestamp).toISOString().split("T")[0];
      analytics.dailyBreakdown[date] =
        (analytics.dailyBreakdown[date] || 0) + 1;
    });

    return {
      totalActions: analytics.totalActions,
      actionBreakdown: analytics.actionBreakdown,
      uniqueUsers: analytics.uniqueUsers.size,
      dailyBreakdown: analytics.dailyBreakdown,
    };
  },
});

// Get generation performance metrics
export const getGenerationMetrics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const completedGenerations = await ctx.db
      .query("usage")
      .withIndex("by_action", (q) => q.eq("action", "generation_completed"))
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startDate),
          q.lte(q.field("timestamp"), args.endDate)
        )
      )
      .collect();

    const failedGenerations = await ctx.db
      .query("usage")
      .withIndex("by_action", (q) => q.eq("action", "generation_failed"))
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startDate),
          q.lte(q.field("timestamp"), args.endDate)
        )
      )
      .collect();

    const startedGenerations = await ctx.db
      .query("usage")
      .withIndex("by_action", (q) => q.eq("action", "generation_started"))
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startDate),
          q.lte(q.field("timestamp"), args.endDate)
        )
      )
      .collect();

    const totalGenerations = startedGenerations.length;
    const successRate =
      totalGenerations > 0
        ? (completedGenerations.length / totalGenerations) * 100
        : 0;

    // Calculate average processing time
    const processingTimes = completedGenerations
      .map((g) => g.metadata?.processingTime)
      .filter((time) => time !== undefined) as number[];

    const avgProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) /
          processingTimes.length
        : 0;

    return {
      totalGenerations,
      completedGenerations: completedGenerations.length,
      failedGenerations: failedGenerations.length,
      successRate: Math.round(successRate * 100) / 100,
      avgProcessingTime: Math.round(avgProcessingTime),
    };
  },
});

// Get popular models/features
export const getPopularModels = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const generations = await ctx.db
      .query("usage")
      .withIndex("by_action", (q) => q.eq("action", "generation_started"))
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startDate),
          q.lte(q.field("timestamp"), args.endDate)
        )
      )
      .collect();

    const modelCounts = {} as Record<string, number>;

    generations.forEach((gen) => {
      const model = gen.metadata?.modelUsed;
      if (model) {
        modelCounts[model] = (modelCounts[model] || 0) + 1;
      }
    });

    // Sort by popularity
    const sortedModels = Object.entries(modelCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, args.limit || 10);

    return sortedModels.map(([model, count]) => ({ model, count }));
  },
});

// Get user activity summary
export const getUserActivitySummary = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const recentActivity = await ctx.db
      .query("usage")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("timestamp"), thirtyDaysAgo))
      .collect();

    const summary = {
      totalActions: recentActivity.length,
      generationsStarted: 0,
      generationsCompleted: 0,
      imageUploads: 0,
      imageDownloads: 0,
      logins: 0,
      lastActivity: 0,
    };

    recentActivity.forEach((activity) => {
      switch (activity.action) {
        case "generation_started":
          summary.generationsStarted++;
          break;
        case "generation_completed":
          summary.generationsCompleted++;
          break;
        case "image_uploaded":
          summary.imageUploads++;
          break;
        case "image_downloaded":
          summary.imageDownloads++;
          break;
        case "login":
          summary.logins++;
          break;
      }

      if (activity.timestamp > summary.lastActivity) {
        summary.lastActivity = activity.timestamp;
      }
    });

    return summary;
  },
});

// Clean up old usage data (for maintenance)
export const cleanupOldUsageData = mutation({
  args: { olderThanDays: v.number() },
  handler: async (ctx, args) => {
    const cutoffDate = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;

    const oldUsageRecords = await ctx.db
      .query("usage")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), cutoffDate))
      .collect();

    let deletedCount = 0;
    for (const record of oldUsageRecords) {
      await ctx.db.delete(record._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});
