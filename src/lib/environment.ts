// src/lib/environment.ts
/**
 * Environment configuration utilities
 *
 * This module provides utilities for managing environment variables
 * and feature flags across the application.
 */

/**
 * Check if we're running in development mode
 */
export const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Check if we're running in production mode
 */
export const isProduction = process.env.NODE_ENV === "production";

/**
 * Check if mock image generation is enabled
 */
export const isMockImageGenerationEnabled =
  process.env.MOCK_IMAGE_GENERATION === "true";

/**
 * Get the current environment mode for image generation
 */
export const getImageGenerationMode = (): "mock" | "real" => {
  return isMockImageGenerationEnabled ? "mock" : "real";
};

/**
 * Environment configuration object
 */
export const env = {
  // Development flags
  isDevelopment,
  isProduction,

  // Feature flags
  mockImageGeneration: isMockImageGenerationEnabled,

  // API Configuration
  nextAuthUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
  nextAuthSecret: process.env.NEXTAUTH_SECRET,

  // OAuth Configuration
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,

  // Convex Configuration
  convexDeployment: process.env.CONVEX_DEPLOYMENT,
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,

  // AI Configuration
  openAiSecret: process.env.OPEN_AI_SECRET,

  // Cloudinary Configuration
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,

  // Stripe Configuration
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
} as const;

/**
 * Validate required environment variables
 */
export function validateEnvironment(): void {
  const requiredVars = [
    "NEXTAUTH_SECRET",
    "NEXT_PUBLIC_CONVEX_URL",
    "CONVEX_DEPLOYMENT",
  ];

  // Only require OpenAI secret if not in mock mode
  if (!isMockImageGenerationEnabled) {
    requiredVars.push("OPEN_AI_SECRET");
  }

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
}

/**
 * Get debug information about the current environment
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    imageGenerationMode: getImageGenerationMode(),
    hasOpenAiKey: !!env.openAiSecret,
    hasCloudinaryConfig: !!(env.cloudinaryCloudName && env.cloudinaryApiKey),
    hasStripeConfig: !!(env.stripePublishableKey && env.stripeSecretKey),
    timestamp: new Date().toISOString(),
  };
}
