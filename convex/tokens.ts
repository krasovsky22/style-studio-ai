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

// Deduct tokens from user balance (atomic operation)
export const deductTokens = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    reason: v.string(),
    generationId: v.id("generations"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.tokenBalance < args.amount) {
      throw new Error(
        `Insufficient tokens. Required: ${args.amount}, Available: ${user.tokenBalance}`
      );
    }

    const newBalance = user.tokenBalance - args.amount;
    const newTotalUsed = user.totalTokensUsed + args.amount;

    await ctx.db.patch(args.userId, {
      tokenBalance: newBalance,
      totalTokensUsed: newTotalUsed,
    });

    // Log the token deduction
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "generation_started",
      timestamp: Date.now(),
      metadata: {
        tokensUsed: args.amount,
        generationId: args.generationId,
        reason: args.reason,
      },
    });

    return newBalance;
  },
});

// Add tokens to user balance (for refunds)
export const addTokens = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    reason: v.string(),
    generationId: v.optional(v.id("generations")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const newBalance = user.tokenBalance + args.amount;
    const newTotalUsed = Math.max(0, user.totalTokensUsed - args.amount);

    await ctx.db.patch(args.userId, {
      tokenBalance: newBalance,
      totalTokensUsed: newTotalUsed,
    });

    // Log the token addition/refund
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "generation_failed", // Use this for refunds
      timestamp: Date.now(),
      metadata: {
        tokensUsed: -args.amount, // Negative for refund
        generationId: args.generationId,
        reason: args.reason,
      },
    });

    return newBalance;
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
