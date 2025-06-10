// Common TypeScript types for the application

export interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  tokenBalance: number;
  totalTokensPurchased: number;
  totalTokensUsed: number;
  freeTokensGranted: number;
}

export interface Generation {
  id: string;
  userId: string;
  status: GenerationStatus;
  createdAt: Date;
  completedAt?: Date;
  productImageUrl: string;
  modelImageUrl?: string;
  resultImageUrl?: string;
  prompt?: string;
  parameters: GenerationParameters;
  processingTime?: number;
  tokensUsed: number;
  error?: string;
  retryCount: number;
}

export interface TokenPurchase {
  id: string;
  userId: string;
  amount: number; // Amount paid in cents
  tokensReceived: number;
  status: TokenPurchaseStatus;
  createdAt: Date;
  completedAt?: Date;
  stripePaymentIntentId?: string;
  transactionId: string;
  paymentMethod?: string;
  packageName: string;
  packageDisplayName: string;
  error?: string;
  refundReason?: string;
}

export interface Usage {
  id: string;
  userId: string;
  action: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  sessionId?: string;
}

export type GenerationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type TokenPurchaseStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded";

export interface GenerationParameters {
  model: string;
  style?: string;
  quality?: string;
  aspectRatio?: string;
  seed?: number;
}

export interface TokenPackage {
  name: string;
  displayName: string;
  tokens: number;
  price: number; // in cents
  popular?: boolean;
  savings?: string;
}
