import { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import { DataModel } from "./_generated/dataModel";
import { createError } from "./utils";

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
