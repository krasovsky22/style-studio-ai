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

    // Token system fields
    tokenBalance: v.number(),
    totalTokensPurchased: v.number(),
    totalTokensUsed: v.number(),
    freeTokensGranted: v.number(),

    // Auth provider fields
    externalId: v.optional(v.string()), // For OAuth providers
    provider: v.optional(v.string()), // "google", "github", etc.
  })
    .index("by_email", ["email"])
    .index("by_external_id", ["externalId"]),

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

    // Images
    productImages: v.array(v.id("files")), // Array of product image URLs
    modelImages: v.array(v.id("files")),
    resultImages: v.array(v.id("files")),

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
    tokensUsed: v.number(), // Number of tokens consumed for this generation
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

  // Usage tracking table for analytics
  usage: defineTable({
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
    timestamp: v.number(),

    // Additional context
    metadata: v.optional(
      v.object({
        generationId: v.optional(v.id("generations")),
        tokenPurchaseId: v.optional(v.id("tokenPurchases")),
        tokensUsed: v.optional(v.number()),
        tokensReceived: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
        processingTime: v.optional(v.number()),
        modelUsed: v.optional(v.string()),
        imageSize: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        reason: v.optional(v.string()),
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
        originalUrl: v.optional(v.string()), // Original Cloudinary URL
        isPrimary: v.optional(v.boolean()), // Whether this is the primary image for the generation
        imageOrder: v.optional(v.number()), // Order of image in the array (0-based)
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category"])
    .index("by_storage_id", ["storageId"])
    .index("by_uploaded_at", ["uploadedAt"]),

  // Token purchases table for payment tracking
  tokenPurchases: defineTable({
    userId: v.id("users"),
    amount: v.number(), // Amount paid in cents (Stripe format)
    tokensReceived: v.number(), // Number of tokens purchased
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),

    // Payment processing
    stripePaymentIntentId: v.optional(v.string()),
    transactionId: v.string(), // Internal transaction ID
    paymentMethod: v.optional(v.string()), // "card", "paypal", etc.

    // Package information
    packageName: v.string(), // "starter", "standard", "pro", "enterprise"
    packageDisplayName: v.string(), // "Starter Pack", "Standard Pack", etc.

    // Error handling
    error: v.optional(v.string()),
    refundReason: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"])
    .index("by_stripe_payment_intent", ["stripePaymentIntentId"])
    .index("by_transaction_id", ["transactionId"])
    .index("by_user_and_status", ["userId", "status"]),
});
