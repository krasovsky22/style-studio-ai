import { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import { DataModel, Id } from "./_generated/dataModel";
import { createError } from "./utils";
import { UserAction } from "./types";

type QueryCtx = GenericQueryCtx<DataModel>;
type MutationCtx = GenericMutationCtx<DataModel>;

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // Try to find user by external ID first
  let user = await ctx.db
    .query("users")
    .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
    .first();

  // If not found by external ID, try by email
  if (!user && identity.email) {
    user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
  }

  return user;
}

/**
 * Get the current user or throw an error if not authenticated
 */
export async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw createError("Authentication required", "UNAUTHORIZED");
  }
  return user;
}

/**
 * Check if the current user has sufficient tokens
 */
export async function requireTokens(
  ctx: QueryCtx | MutationCtx,
  tokensRequired: number = 1
) {
  const user = await getCurrentUserOrThrow(ctx);

  if (user.tokenBalance < tokensRequired) {
    throw createError(
      `Insufficient tokens. Required: ${tokensRequired}, Available: ${user.tokenBalance}`,
      "INSUFFICIENT_TOKENS"
    );
  }

  return user;
}

/**
 * Check if the current user can perform a specific action
 */
export async function checkUserPermission(
  ctx: QueryCtx | MutationCtx,
  action:
    | "create_generation"
    | "batch_processing"
    | "api_access"
    | "admin_access"
) {
  const user = await getCurrentUserOrThrow(ctx);

  switch (action) {
    case "create_generation":
      // Check if user has sufficient tokens
      if (user.tokenBalance < 1) {
        throw createError(
          "Insufficient tokens for generation",
          "INSUFFICIENT_TOKENS"
        );
      }
      break;

    case "batch_processing":
      // Require at least 10 tokens for batch processing
      if (user.tokenBalance < 10) {
        throw createError(
          "Batch processing requires at least 10 tokens",
          "INSUFFICIENT_TOKENS"
        );
      }
      break;

    case "api_access":
      // Require at least 1 token for API access
      if (user.tokenBalance < 1) {
        throw createError(
          "API access requires at least 1 token",
          "INSUFFICIENT_TOKENS"
        );
      }
      break;

    case "admin_access":
      // In a real app, you'd have admin role checking here
      // For now, we'll check if user has made significant token purchases
      if (user.totalTokensPurchased < 1000) {
        throw createError("Admin access denied", "ACCESS_DENIED");
      }
      break;

    default:
      throw createError("Unknown action", "INVALID_ACTION");
  }

  return user;
}

/**
 * Create or update user from authentication identity
 */
export async function createOrUpdateUserFromAuth(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw createError("No authentication identity found", "NO_IDENTITY");
  }

  // Check if user already exists
  let user = await ctx.db
    .query("users")
    .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
    .first();

  if (!user && identity.email) {
    // Try to find by email
    user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
  }

  const now = Date.now();

  if (user) {
    // Update existing user
    await ctx.db.patch(user._id, {
      lastLoginAt: now,
      externalId: identity.subject,
      provider: identity.issuer,
      name: identity.name || user.name,
      profileImage: identity.pictureUrl || user.profileImage,
      email: identity.email || user.email,
    });

    // Log login
    await ctx.db.insert("usage", {
      userId: user._id,
      action: "login",
      timestamp: now,
    });

    return user._id;
  } else {
    // Create new user
    if (!identity.email) {
      throw createError(
        "Email is required for new user creation",
        "EMAIL_REQUIRED"
      );
    }

    const userId = await ctx.db.insert("users", {
      email: identity.email,
      name: identity.name || "User",
      profileImage: identity.pictureUrl,
      externalId: identity.subject,
      provider: identity.issuer,
      createdAt: now,
      lastLoginAt: now,
      tokenBalance: 5, // Give new users 5 free tokens
      totalTokensPurchased: 0,
      totalTokensUsed: 0,
      freeTokensGranted: 5,
    });

    // Log user creation and login
    await ctx.db.insert("usage", {
      userId,
      action: "login",
      timestamp: now,
    });

    return userId;
  }
}

/**
 * Check if user owns a resource
 */
export async function checkResourceOwnership(
  ctx: QueryCtx | MutationCtx,
  resourceType: "generation" | "file" | "tokenPurchase",
  resourceId: Id<"generations"> | Id<"files"> | Id<"tokenPurchases">
) {
  const user = await getCurrentUserOrThrow(ctx);

  let resource;
  switch (resourceType) {
    case "generation":
      resource = await ctx.db.get(resourceId as Id<"generations">);
      if (resource && "userId" in resource && resource.userId !== user._id) {
        throw createError("Access denied", "ACCESS_DENIED");
      }
      break;
    case "file":
      resource = await ctx.db.get(resourceId as Id<"files">);
      if (resource && "userId" in resource && resource.userId !== user._id) {
        throw createError("Access denied", "ACCESS_DENIED");
      }
      break;
    case "tokenPurchase":
      resource = await ctx.db.get(resourceId as Id<"tokenPurchases">);
      if (resource && "userId" in resource && resource.userId !== user._id) {
        throw createError("Access denied", "ACCESS_DENIED");
      }
      break;
    default:
      throw createError("Unknown resource type", "INVALID_RESOURCE_TYPE");
  }

  if (!resource) {
    throw createError(`${resourceType} not found`, "RESOURCE_NOT_FOUND");
  }

  return { user, resource };
}

/**
 * Rate limiting helper
 */
export async function checkRateLimit(
  ctx: QueryCtx | MutationCtx,
  action: UserAction,
  windowMs: number = 60 * 60 * 1000, // 1 hour
  maxRequests: number = 10
) {
  const user = await getCurrentUserOrThrow(ctx);
  const windowStart = Date.now() - windowMs;

  const recentActions = await ctx.db
    .query("usage")
    .withIndex("by_user_and_action", (q) =>
      q.eq("userId", user._id).eq("action", action)
    )
    .filter((q) => q.gte(q.field("timestamp"), windowStart))
    .collect();

  if (recentActions.length >= maxRequests) {
    throw createError("Rate limit exceeded", "RATE_LIMIT_EXCEEDED");
  }

  return user;
}

/**
 * Get user's current token info with usage stats
 */
export async function getUserTokenInfo(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrThrow(ctx);

  // Get recent token purchases
  const recentPurchases = await ctx.db
    .query("tokenPurchases")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .order("desc")
    .take(5);

  // Get recent generations for usage tracking
  const recentGenerations = await ctx.db
    .query("generations")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .order("desc")
    .take(10);

  const totalTokensSpent = recentGenerations.reduce(
    (sum, gen) => sum + gen.tokensUsed,
    0
  );

  return {
    tokenBalance: user.tokenBalance,
    totalTokensPurchased: user.totalTokensPurchased,
    totalTokensUsed: user.totalTokensUsed,
    freeTokensGranted: user.freeTokensGranted,
    recentPurchases,
    recentGenerations,
    stats: {
      availableTokens: user.tokenBalance,
      recentUsage: totalTokensSpent,
      totalLifetimePurchased: user.totalTokensPurchased,
      totalLifetimeUsed: user.totalTokensUsed,
    },
  };
}
