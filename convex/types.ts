import { Doc, Id } from "./_generated/dataModel";

// User types
export type User = Doc<"users">;
export type UserId = Id<"users">;

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
export type GenerationStatus = Generation["status"];

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

// Token purchase types
export type TokenPurchase = Doc<"tokenPurchases">;
export type TokenPurchaseId = Id<"tokenPurchases">;

export type TokenPurchaseStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded";

export type CreateTokenPurchaseArgs = {
  userId: UserId;
  amount: number; // Amount in cents
  tokensReceived: number;
  packageName: string;
  packageDisplayName: string;
  paymentMethod?: string;
  stripePaymentIntentId?: string;
};

// Token package definitions
export type TokenPackage = {
  name: string;
  displayName: string;
  tokens: number;
  price: number; // in cents
  popular?: boolean;
  savings?: string;
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
  | "tokens_purchased"
  | "login"
  | "logout";

export type UsageMetadata = {
  generationId?: GenerationId;
  tokenPurchaseId?: TokenPurchaseId;
  tokensUsed?: number;
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

export type TokenUsageStats = {
  tokenBalance: number;
  totalTokensPurchased: number;
  totalTokensUsed: number;
  freeTokensGranted: number;
  recentPurchases: TokenPurchase[];
  usageThisMonth: number;
};

export type DashboardStats = {
  user: {
    name: string;
    email: string;
    tokenBalance: number;
    memberSince: number;
  };
  tokenStats: TokenUsageStats;
  generationStats: GenerationStats;
  activityStats: {
    totalActions: number;
    generationsThisMonth: number;
    lastActivity: number;
  };
};

export type SystemStats = {
  totalUsers: number;
  tokenStats: {
    totalTokensSold: number;
    totalTokensUsed: number;
    activeUsersWithTokens: number;
    avgTokensPerUser: number;
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
