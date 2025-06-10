import { query } from "./_generated/server";
import { v } from "convex/values";

// Real-time subscription for user's generation updates
export const subscribeToUserGenerations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all generations for the user, ordered by creation date
    return await ctx.db
      .query("generations")
      .withIndex("by_user_and_created_at", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Real-time subscription for specific generation status
export const subscribeToGeneration = query({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.generationId);
  },
});

// Real-time subscription for pending generations (for processing queue)
export const subscribeToPendingGenerations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("generations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc") // First in, first out
      .collect();
  },
});

// Real-time subscription for processing generations
export const subscribeToProcessingGenerations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("generations")
      .withIndex("by_status", (q) => q.eq("status", "processing"))
      .collect();
  },
});

// Real-time subscription for user's recent activity
export const subscribeToUserActivity = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    return await ctx.db
      .query("usage")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// Real-time subscription for dashboard statistics
export const subscribeToDashboardStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user info
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // Get generation statistics
    const allGenerations = await ctx.db
      .query("generations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const generationStats = {
      total: allGenerations.length,
      completed: allGenerations.filter((g) => g.status === "completed").length,
      failed: allGenerations.filter((g) => g.status === "failed").length,
      pending: allGenerations.filter((g) => g.status === "pending").length,
      processing: allGenerations.filter((g) => g.status === "processing")
        .length,
    };

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentActivity = await ctx.db
      .query("usage")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("timestamp"), thirtyDaysAgo))
      .collect();

    const activityStats = {
      totalActions: recentActivity.length,
      generationsThisMonth: recentActivity.filter(
        (a) => a.action === "generation_started"
      ).length,
      lastActivity:
        recentActivity.length > 0
          ? recentActivity[0].timestamp
          : user.lastLoginAt,
    };

    return {
      user: {
        name: user.name,
        email: user.email,
        memberSince: user.createdAt,
      },
      generationStats,
      activityStats,
    };
  },
});

// Real-time subscription for system-wide statistics (admin only)
export const subscribeToSystemStats = query({
  args: {},
  handler: async (ctx) => {
    // Get total users
    const allUsers = await ctx.db.query("users").collect();
    const totalUsers = allUsers.length;

    // Get recent generations (last 24 hours)
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentGenerations = await ctx.db
      .query("generations")
      .withIndex("by_created_at")
      .filter((q) => q.gte(q.field("createdAt"), twentyFourHoursAgo))
      .collect();

    const generationStats = {
      total24h: recentGenerations.length,
      completed24h: recentGenerations.filter((g) => g.status === "completed")
        .length,
      failed24h: recentGenerations.filter((g) => g.status === "failed").length,
      pending: await ctx.db
        .query("generations")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect()
        .then((results) => results.length),
      processing: await ctx.db
        .query("generations")
        .withIndex("by_status", (q) => q.eq("status", "processing"))
        .collect()
        .then((results) => results.length),
    };

    return {
      totalUsers,
      generationStats,
      lastUpdated: Date.now(),
    };
  },
});
