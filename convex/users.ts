import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { USER_INITIAL_FREE_TOKENS } from "./constants";

// Create a new user
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    profileImage: v.optional(v.string()),
    externalId: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      profileImage: args.profileImage,
      emailVerified: args.provider ? now : undefined, // Auto-verify OAuth users
      externalId: args.externalId,
      provider: args.provider,
      createdAt: now,
      lastLoginAt: now,
      tokenBalance: USER_INITIAL_FREE_TOKENS,
      totalTokensPurchased: 0,
      totalTokensUsed: 0,
      freeTokensGranted: USER_INITIAL_FREE_TOKENS,
    });

    // Log user creation
    await ctx.db.insert("usage", {
      userId,
      action: "login",
      timestamp: now,
    });

    return userId;
  },
});

// Get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get user by ID (alias for backward compatibility)
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get user by external ID (for OAuth)
export const getUserByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

// Update user profile
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    updates: v.object({
      name: v.optional(v.string()),
      profileImage: v.optional(v.string()),
      emailVerified: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, updates } = args;

    await ctx.db.patch(userId, updates);

    const updatedUser = await ctx.db.get(userId);
    return updatedUser;
  },
});

// Update last login time
export const updateLastLogin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.userId, {
      lastLoginAt: now,
    });

    // Log login
    await ctx.db.insert("usage", {
      userId: args.userId,
      action: "login",
      timestamp: now,
    });

    return true;
  },
});

// Get user statistics
export const getUserStats = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return null;
    }

    // Get generation stats
    const totalGenerations = await ctx.db
      .query("generations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const successfulGenerations = totalGenerations.filter(
      (gen) => gen.status === "completed"
    );

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const monthlyGenerations = totalGenerations.filter(
      (gen) => gen.createdAt >= thisMonthStart.getTime()
    );

    return {
      totalGenerations: totalGenerations.length,
      successfulGenerations: successfulGenerations.length,
      monthlyGenerations: monthlyGenerations.length,
      successRate:
        totalGenerations.length > 0
          ? Math.round(
              (successfulGenerations.length / totalGenerations.length) * 100
            )
          : 100,
    };
  },
});

// Create or get user for OAuth login
export const createOrGetUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    profileImage: v.optional(v.string()),
    externalId: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // First try to find user by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      // Update user's last login and OAuth info
      await ctx.db.patch(existingUser._id, {
        lastLoginAt: now,
        externalId: args.externalId || existingUser.externalId,
        provider: args.provider || existingUser.provider,
        name: args.name || existingUser.name,
        profileImage: args.profileImage || existingUser.profileImage,
      });

      // Log login
      await ctx.db.insert("usage", {
        userId: existingUser._id,
        action: "login",
        timestamp: now,
      });

      return existingUser._id;
    }

    // Create new user if doesn't exist
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      profileImage: args.profileImage,
      emailVerified: args.provider ? now : undefined, // Auto-verify OAuth users
      externalId: args.externalId,
      provider: args.provider,
      createdAt: now,
      lastLoginAt: now,
      tokenBalance: USER_INITIAL_FREE_TOKENS,
      totalTokensPurchased: 0,
      totalTokensUsed: 0,
      freeTokensGranted: USER_INITIAL_FREE_TOKENS,
    });

    // Log user creation and login
    await ctx.db.insert("usage", {
      userId,
      action: "login",
      timestamp: now,
    });

    return userId;
  },
});
