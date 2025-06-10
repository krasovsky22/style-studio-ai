import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table with profile information
  users: defineTable({
    email: v.string(),
    name: v.string(),
    profileImage: v.optional(v.string()),
    emailVerified: v.optional(v.number()), // Date timestamp
    createdAt: v.number(),
    lastLoginAt: v.number(),
    subscriptionTier: v.union(
      v.literal("free"),
      v.literal("basic"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    usageCount: v.number(),
    resetDate: v.number(),
    // Auth provider fields
    externalId: v.optional(v.string()), // For OAuth providers
    provider: v.optional(v.string()), // "google", "github", etc.
  })
    .index("by_email", ["email"])
    .index("by_external_id", ["externalId"])
    .index("by_subscription_tier", ["subscriptionTier"]),

  // Generations table for AI image generations
  generations: defineTable({
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),

    // Image URLs
    productImageUrl: v.string(),
    modelImageUrl: v.optional(v.string()),
    resultImageUrl: v.optional(v.string()),

    // Generation parameters
    prompt: v.string(),
    parameters: v.object({
      model: v.string(),
      style: v.optional(v.string()),
      quality: v.optional(v.string()),
      aspectRatio: v.optional(v.string()),
      seed: v.optional(v.number()),
    }),

    // Processing info
    processingTime: v.optional(v.number()), // in milliseconds
    error: v.optional(v.string()),
    retryCount: v.number(),

    // External service IDs
    replicateId: v.optional(v.string()),
    cloudinaryPublicId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_and_created_at", ["userId", "createdAt"]),

  // Subscriptions table for user plans
  subscriptions: defineTable({
    userId: v.id("users"),
    planType: v.union(
      v.literal("free"),
      v.literal("basic"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("past_due"),
      v.literal("unpaid"),
      v.literal("incomplete")
    ),
    startDate: v.number(),
    endDate: v.optional(v.number()),

    // Stripe integration
    stripeSubscriptionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),

    // Usage limits
    generationsLimit: v.number(),
    generationsUsed: v.number(),

    // Billing
    amount: v.optional(v.number()), // in cents
    currency: v.optional(v.string()),
    interval: v.optional(v.union(v.literal("month"), v.literal("year"))),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_status", ["status"])
    .index("by_plan_type", ["planType"]),

  // Usage tracking table for analytics
  usage: defineTable({
    userId: v.id("users"),
    action: v.union(
      v.literal("generation_started"),
      v.literal("generation_completed"),
      v.literal("generation_failed"),
      v.literal("image_uploaded"),
      v.literal("image_downloaded"),
      v.literal("subscription_created"),
      v.literal("subscription_updated"),
      v.literal("subscription_cancelled"),
      v.literal("login"),
      v.literal("logout")
    ),
    timestamp: v.number(),

    // Additional context
    metadata: v.optional(
      v.object({
        generationId: v.optional(v.id("generations")),
        subscriptionId: v.optional(v.id("subscriptions")),
        errorMessage: v.optional(v.string()),
        processingTime: v.optional(v.number()),
        modelUsed: v.optional(v.string()),
        imageSize: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    ),

    ipAddress: v.optional(v.string()),

    // Session tracking
    sessionId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"])
    .index("by_user_and_action", ["userId", "action"])
    .index("by_user_and_timestamp", ["userId", "timestamp"]),

  // File storage metadata (for images not stored in Cloudinary)
  files: defineTable({
    userId: v.id("users"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    storageId: v.string(), // Convex storage ID
    uploadedAt: v.number(),

    // File categorization
    category: v.union(
      v.literal("product_image"),
      v.literal("model_image"),
      v.literal("generated_image"),
      v.literal("profile_image")
    ),

    // Optional metadata
    metadata: v.optional(
      v.object({
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        format: v.optional(v.string()),
        generationId: v.optional(v.id("generations")),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category"])
    .index("by_storage_id", ["storageId"])
    .index("by_uploaded_at", ["uploadedAt"]),
});
