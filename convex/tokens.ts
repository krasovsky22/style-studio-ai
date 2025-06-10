import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new token purchase
export const createTokenPurchase = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(), // Amount in cents
    tokensReceived: v.number(),
    packageName: v.string(),
    packageDisplayName: v.string(),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const transactionId = `tx_${now}_${Math.random().toString(36).substring(2)}`;

    const purchaseId = await ctx.db.insert("tokenPurchases", {
      userId: args.userId,
      amount: args.amount,
      tokensReceived: args.tokensReceived,
      status: "pending",
      createdAt: now,
      transactionId,
      paymentMethod: args.paymentMethod,
      packageName: args.packageName,
      packageDisplayName: args.packageDisplayName,
    });

    // Log token purchase start
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "tokens_purchased",
      timestamp: now,
      metadata: {
        tokenPurchaseId: purchaseId,
        tokensReceived: args.tokensReceived,
      },
    });

    return purchaseId;
  },
});

// Complete a token purchase (called after successful payment)
export const completeTokenPurchase = mutation({
  args: {
    purchaseId: v.id("tokenPurchases"),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) {
      throw new Error("Token purchase not found");
    }

    if (purchase.status !== "pending") {
      throw new Error("Token purchase is not in pending status");
    }

    const now = Date.now();

    // Update purchase status
    await ctx.db.patch(args.purchaseId, {
      status: "completed",
      completedAt: now,
      stripePaymentIntentId: args.stripePaymentIntentId,
    });

    // Add tokens to user balance
    const user = await ctx.db.get(purchase.userId);
    if (user) {
      await ctx.db.patch(purchase.userId, {
        tokenBalance: user.tokenBalance + purchase.tokensReceived,
        totalTokensPurchased:
          user.totalTokensPurchased + purchase.tokensReceived,
      });
    }

    return args.purchaseId;
  },
});

// Fail a token purchase
export const failTokenPurchase = mutation({
  args: {
    purchaseId: v.id("tokenPurchases"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) {
      throw new Error("Token purchase not found");
    }

    await ctx.db.patch(args.purchaseId, {
      status: "failed",
      error: args.error,
    });

    return args.purchaseId;
  },
});

// Get user's token purchase history
export const getUserTokenPurchases = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    return await ctx.db
      .query("tokenPurchases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// Get token purchase by transaction ID
export const getTokenPurchaseByTransactionId = query({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tokenPurchases")
      .withIndex("by_transaction_id", (q) =>
        q.eq("transactionId", args.transactionId)
      )
      .first();
  },
});

// Get token purchase by Stripe payment intent ID
export const getTokenPurchaseByStripeId = query({
  args: { stripePaymentIntentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tokenPurchases")
      .withIndex("by_stripe_payment_intent", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId)
      )
      .first();
  },
});

// Get user's token balance and stats
export const getUserTokenStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get recent token purchases
    const recentPurchases = await ctx.db
      .query("tokenPurchases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(5);

    // Get recent generations to show token usage
    const recentGenerations = await ctx.db
      .query("generations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(10);

    return {
      tokenBalance: user.tokenBalance,
      totalTokensPurchased: user.totalTokensPurchased,
      totalTokensUsed: user.totalTokensUsed,
      freeTokensGranted: user.freeTokensGranted,
      recentPurchases,
      recentGenerations,
    };
  },
});

// Admin function to grant free tokens
export const grantFreeTokens = mutation({
  args: {
    userId: v.id("users"),
    tokens: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // In a real app, you'd check admin permissions here
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      tokenBalance: user.tokenBalance + args.tokens,
      freeTokensGranted: user.freeTokensGranted + args.tokens,
    });

    // Log the token grant
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "tokens_purchased", // We'll use this for free grants too
      timestamp: Date.now(),
      metadata: {
        tokensReceived: args.tokens,
        reason: args.reason || "Free tokens granted",
      },
    });

    return args.userId;
  },
});
