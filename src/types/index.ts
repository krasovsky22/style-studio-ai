// Common TypeScript types for the application

export interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  subscriptionTier: SubscriptionTier;
  usageCount: number;
  resetDate: Date;
}

export interface Generation {
  id: string;
  userId: string;
  status: GenerationStatus;
  createdAt: Date;
  productImageUrl: string;
  modelImageUrl?: string;
  resultImageUrl?: string;
  prompt?: string;
  parameters: GenerationParameters;
  processingTime?: number;
  error?: string;
  retryCount: number;
}

export interface Subscription {
  id: string;
  userId: string;
  planType: SubscriptionTier;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  stripeSubscriptionId?: string;
  generationsLimit: number;
  generationsUsed: number;
}

export interface Usage {
  id: string;
  userId: string;
  action: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export type SubscriptionTier = "free" | "basic" | "pro" | "enterprise";
export type GenerationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";
export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "cancelled"
  | "past_due";

export interface GenerationParameters {
  style: "realistic" | "artistic" | "minimal";
  quality: "standard" | "high";
  size: "512x512" | "768x768" | "1024x1024";
}
