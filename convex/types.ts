import { Doc, Id } from "./_generated/dataModel";

// User types
export type User = Doc<"users">;
export type UserId = Id<"users">;

export type UserSubscriptionTier = "free" | "basic" | "pro" | "enterprise";

// Feature types for subscription plans
export type SubscriptionFeature =
  | "basic_generation"
  | "high_quality"
  | "batch_processing"
  | "api_access"
  | "priority_support"
  | "all";

export type CreateUserArgs = {
  email: string;
  name: string;
  profileImage?: string;
  externalId?: string;
  provider?: string;
};

// Generation types
export type Generation = Doc<"generations">;
export type GenerationId = Id<"generations">;

export type GenerationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type GenerationParameters = {
  model: string;
  style?: string;
  quality?: string;
  aspectRatio?: string;
  seed?: number;
};

export type CreateGenerationArgs = {
  userId: UserId;
  productImageUrl: string;
  modelImageUrl?: string;
  prompt: string;
  parameters: GenerationParameters;
};

// Subscription types
export type Subscription = Doc<"subscriptions">;
export type SubscriptionId = Id<"subscriptions">;

export type SubscriptionPlanType = "free" | "basic" | "pro" | "enterprise";
export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "past_due"
  | "unpaid"
  | "incomplete";
export type SubscriptionInterval = "month" | "year";

export type CreateSubscriptionArgs = {
  userId: UserId;
  planType: SubscriptionPlanType;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  amount?: number;
  currency?: string;
  interval?: SubscriptionInterval;
};

// Usage types
export type Usage = Doc<"usage">;
export type UsageId = Id<"usage">;

export type UserAction =
  | "generation_started"
  | "generation_completed"
  | "generation_failed"
  | "image_uploaded"
  | "image_downloaded"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "login"
  | "logout";

export type UsageMetadata = {
  generationId?: GenerationId;
  subscriptionId?: SubscriptionId;
  errorMessage?: string;
  processingTime?: number;
  modelUsed?: string;
  imageSize?: string;
  userAgent?: string;
};

// File types
export type File = Doc<"files">;
export type FileId = Id<"files">;

export type FileCategory =
  | "product_image"
  | "model_image"
  | "generated_image"
  | "profile_image";

export type FileMetadata = {
  width?: number;
  height?: number;
  format?: string;
  generationId?: GenerationId;
};

export type CreateFileArgs = {
  userId: UserId;
  filename: string;
  contentType: string;
  size: number;
  storageId: string;
  category: FileCategory;
  metadata?: FileMetadata;
};

// Analytics types
export type GenerationStats = {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  cancelled: number;
};

export type UsageAnalytics = {
  totalActions: number;
  actionBreakdown: Record<UserAction, number>;
  uniqueUsers: number;
  dailyBreakdown: Record<string, number>;
};

export type GenerationMetrics = {
  totalGenerations: number;
  completedGenerations: number;
  failedGenerations: number;
  successRate: number;
  avgProcessingTime: number;
};

export type SubscriptionUsage = {
  planType: SubscriptionPlanType;
  generationsUsed: number;
  generationsLimit: number;
  remainingGenerations: number;
  usagePercentage: number;
  status: SubscriptionStatus;
};

export type DashboardStats = {
  user: {
    name: string;
    email: string;
    subscriptionTier: UserSubscriptionTier;
    memberSince: number;
  };
  subscription: SubscriptionUsage | null;
  generationStats: GenerationStats;
  activityStats: {
    totalActions: number;
    generationsThisMonth: number;
    lastActivity: number;
  };
};

export type SystemStats = {
  totalUsers: number;
  subscriptionStats: {
    total: number;
    free: number;
    basic: number;
    pro: number;
    enterprise: number;
  };
  generationStats: {
    total24h: number;
    completed24h: number;
    failed24h: number;
    pending: number;
    processing: number;
  };
  lastUpdated: number;
};
