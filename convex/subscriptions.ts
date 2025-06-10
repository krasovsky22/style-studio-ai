import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new subscription
export const createSubscription = mutation({
  args: {
    userId: v.id("users"),
    planType: v.union(
      v.literal("free"),
      v.literal("basic"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    interval: v.optional(v.union(v.literal("month"), v.literal("year"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Deactivate existing active subscriptions
    const existingSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const subscription of existingSubscriptions) {
      await ctx.db.patch(subscription._id, {
        status: "cancelled",
        endDate: now,
        updatedAt: now,
      });
    }

    // Define generation limits based on plan type
    const generationLimits = {
      free: 5,
      basic: 50,
      pro: 200,
      enterprise: 10000, // Effectively unlimited
    };

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: args.userId,
      planType: args.planType,
      status: "active",
      startDate: now,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      stripePriceId: args.stripePriceId,
      generationsLimit: generationLimits[args.planType],
      generationsUsed: 0,
      amount: args.amount,
      currency: args.currency,
      interval: args.interval,
      createdAt: now,
      updatedAt: now,
    });

    // Update user's subscription tier
    await ctx.db.patch(args.userId, {
      subscriptionTier: args.planType,
    });

    // Log subscription creation
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "subscription_created",
      timestamp: now,
      metadata: {
        subscriptionId,
      },
    });

    return subscriptionId;
  },
});

// Update subscription status (for Stripe webhooks)
export const updateSubscriptionStatus = mutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("past_due"),
      v.literal("unpaid"),
      v.literal("incomplete")
    ),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const now = Date.now();
    await ctx.db.patch(subscription._id, {
      status: args.status,
      endDate: args.endDate,
      updatedAt: now,
    });

    // If subscription is cancelled or ended, downgrade user to free
    if (args.status === "cancelled" || args.status === "unpaid") {
      await ctx.db.patch(subscription.userId, {
        subscriptionTier: "free",
      });

      // Create a new free subscription
      await ctx.db.insert("subscriptions", {
        userId: subscription.userId,
        planType: "free",
        status: "active",
        startDate: now,
        generationsLimit: 5,
        generationsUsed: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Log subscription update
    await ctx.db.insert("usage", {
      userId: subscription.userId,
      action: "subscription_updated",
      timestamp: now,
      metadata: {
        subscriptionId: subscription._id,
      },
    });

    return subscription._id;
  },
});

// Cancel subscription
export const cancelSubscription = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    const now = Date.now();
    await ctx.db.patch(subscription._id, {
      status: "cancelled",
      endDate: now,
      updatedAt: now,
    });

    // Downgrade user to free
    await ctx.db.patch(args.userId, {
      subscriptionTier: "free",
    });

    // Create a new free subscription
    const freeSubscriptionId = await ctx.db.insert("subscriptions", {
      userId: args.userId,
      planType: "free",
      status: "active",
      startDate: now,
      generationsLimit: 5,
      generationsUsed: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Log subscription cancellation
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "subscription_cancelled",
      timestamp: now,
      metadata: {
        subscriptionId: subscription._id,
      },
    });

    return freeSubscriptionId;
  },
});

// Get user's active subscription
export const getUserActiveSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

// Get subscription by Stripe ID
export const getSubscriptionByStripeId = query({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();
  },
});

// Get all subscriptions for a user (history)
export const getUserSubscriptionHistory = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get subscription usage summary
export const getSubscriptionUsage = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!subscription) {
      return null;
    }

    const usagePercentage =
      (subscription.generationsUsed / subscription.generationsLimit) * 100;
    const remainingGenerations =
      subscription.generationsLimit - subscription.generationsUsed;

    return {
      planType: subscription.planType,
      generationsUsed: subscription.generationsUsed,
      generationsLimit: subscription.generationsLimit,
      remainingGenerations,
      usagePercentage: Math.round(usagePercentage),
      status: subscription.status,
    };
  },
});

// Reset subscription usage (monthly reset)
export const resetSubscriptionUsage = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    await ctx.db.patch(subscription._id, {
      generationsUsed: 0,
      updatedAt: Date.now(),
    });

    return subscription._id;
  },
});

// Get subscription statistics (for admin dashboard)
export const getSubscriptionStats = query({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const stats = {
      total: subscriptions.length,
      free: 0,
      basic: 0,
      pro: 0,
      enterprise: 0,
    };

    subscriptions.forEach((sub) => {
      stats[sub.planType]++;
    });

    return stats;
  },
});
