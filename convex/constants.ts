// Application constants

// Generation models and their configurations
export const AI_MODELS = {
  "stable-diffusion-xl": {
    name: "Stable Diffusion XL",
    description: "High-quality image generation with excellent detail",
    supportedAspectRatios: ["1:1", "16:9", "9:16", "3:2", "2:3"],
    maxResolution: "1024x1024",
    estimatedTime: "30-60 seconds",
  },
  "stable-diffusion-3": {
    name: "Stable Diffusion 3",
    description: "Latest model with improved prompt adherence",
    supportedAspectRatios: ["1:1", "16:9", "9:16", "3:2", "2:3", "4:3", "3:4"],
    maxResolution: "1344x768",
    estimatedTime: "45-90 seconds",
  },
  "flux-dev": {
    name: "Flux Dev",
    description: "Fast generation with good quality",
    supportedAspectRatios: ["1:1", "16:9", "9:16"],
    maxResolution: "1024x1024",
    estimatedTime: "15-30 seconds",
  },
} as const;

// Style presets for generation
export const STYLE_PRESETS = {
  realistic: {
    name: "Realistic",
    prompt: "photorealistic, high quality, detailed",
    description: "Natural, lifelike appearance",
  },
  fashion: {
    name: "Fashion",
    prompt: "fashion photography, studio lighting, professional",
    description: "Professional fashion shoot style",
  },
  artistic: {
    name: "Artistic",
    prompt: "artistic, creative, stylized",
    description: "Creative and artistic interpretation",
  },
  vintage: {
    name: "Vintage",
    prompt: "vintage style, retro, classic",
    description: "Vintage and retro aesthetic",
  },
  minimalist: {
    name: "Minimalist",
    prompt: "minimalist, clean, simple",
    description: "Clean and minimal style",
  },
} as const;

// Quality settings
export const QUALITY_SETTINGS = {
  draft: {
    name: "Draft",
    description: "Fast generation, lower quality",
    steps: 20,
    guidance: 7.5,
  },
  standard: {
    name: "Standard",
    description: "Balanced quality and speed",
    steps: 30,
    guidance: 8.5,
  },
  high: {
    name: "High",
    description: "High quality, slower generation",
    steps: 50,
    guidance: 9.5,
  },
} as const;

// Aspect ratios
export const ASPECT_RATIOS = {
  "1:1": { name: "Square", width: 1024, height: 1024 },
  "16:9": { name: "Landscape", width: 1344, height: 768 },
  "9:16": { name: "Portrait", width: 768, height: 1344 },
  "3:2": { name: "Photo", width: 1216, height: 832 },
  "2:3": { name: "Tall Photo", width: 832, height: 1216 },
  "4:3": { name: "Standard", width: 1152, height: 896 },
  "3:4": { name: "Tall Standard", width: 896, height: 1152 },
} as const;

// File upload limits
export const FILE_LIMITS = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
} as const;

// Error messages
export const ERROR_MESSAGES = {
  auth: {
    unauthorized: "You must be logged in to perform this action",
    forbidden: "You don't have permission to perform this action",
    invalidToken: "Invalid or expired authentication token",
  },
  user: {
    notFound: "User not found",
    emailExists: "User with this email already exists",
    invalidEmail: "Please provide a valid email address",
  },
  generation: {
    notFound: "Generation not found",
    limitExceeded:
      "You have exceeded your generation limit for this billing period",
    invalidParameters: "Invalid generation parameters provided",
    processingFailed: "Generation processing failed",
    maxRetriesExceeded: "Maximum retry attempts exceeded",
  },
  subscription: {
    notFound: "Subscription not found",
    alreadyExists: "Active subscription already exists",
    paymentFailed: "Payment processing failed",
    invalidPlan: "Invalid subscription plan",
  },
  file: {
    notFound: "File not found",
    tooLarge: "File size exceeds the limit",
    invalidType: "File type not supported",
    uploadFailed: "File upload failed",
  },
  validation: {
    required: "This field is required",
    invalidFormat: "Invalid format",
    tooShort: "Value is too short",
    tooLong: "Value is too long",
  },
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  user: {
    created: "Account created successfully",
    updated: "Profile updated successfully",
    deleted: "Account deleted successfully",
  },
  generation: {
    created: "Generation started successfully",
    completed: "Generation completed successfully",
    cancelled: "Generation cancelled successfully",
    retried: "Generation retry initiated",
  },
  subscription: {
    created: "Subscription created successfully",
    updated: "Subscription updated successfully",
    cancelled: "Subscription cancelled successfully",
    upgraded: "Subscription upgraded successfully",
    downgraded: "Subscription downgraded successfully",
  },
  file: {
    uploaded: "File uploaded successfully",
    deleted: "File deleted successfully",
  },
} as const;

// API rate limits
export const RATE_LIMITS = {
  generation: {
    free: { requests: 5, window: 60 * 60 * 1000 }, // 5 per hour
    basic: { requests: 10, window: 60 * 60 * 1000 }, // 10 per hour
    pro: { requests: 30, window: 60 * 60 * 1000 }, // 30 per hour
    enterprise: { requests: 100, window: 60 * 60 * 1000 }, // 100 per hour
  },
  api: {
    free: { requests: 100, window: 60 * 60 * 1000 }, // 100 per hour
    basic: { requests: 500, window: 60 * 60 * 1000 }, // 500 per hour
    pro: { requests: 2000, window: 60 * 60 * 1000 }, // 2000 per hour
    enterprise: { requests: 10000, window: 60 * 60 * 1000 }, // 10000 per hour
  },
} as const;

// Email templates
export const EMAIL_TEMPLATES = {
  welcome: {
    subject: "Welcome to Style Studio AI!",
    template: "welcome",
  },
  subscriptionCreated: {
    subject: "Subscription Activated",
    template: "subscription-created",
  },
  subscriptionCancelled: {
    subject: "Subscription Cancelled",
    template: "subscription-cancelled",
  },
  generationCompleted: {
    subject: "Your generation is ready!",
    template: "generation-completed",
  },
  usageLimitWarning: {
    subject: "Usage Limit Warning",
    template: "usage-limit-warning",
  },
} as const;

// Webhook events
export const WEBHOOK_EVENTS = {
  stripe: {
    subscriptionCreated: "customer.subscription.created",
    subscriptionUpdated: "customer.subscription.updated",
    subscriptionDeleted: "customer.subscription.deleted",
    invoicePaymentSucceeded: "invoice.payment_succeeded",
    invoicePaymentFailed: "invoice.payment_failed",
  },
  replicate: {
    predictionStarted: "prediction.started",
    predictionCompleted: "prediction.completed",
    predictionFailed: "prediction.failed",
    predictionCancelled: "prediction.cancelled",
  },
} as const;

// Cache durations (in milliseconds)
export const CACHE_DURATIONS = {
  user: 5 * 60 * 1000, // 5 minutes
  subscription: 10 * 60 * 1000, // 10 minutes
  generation: 30 * 1000, // 30 seconds
  analytics: 60 * 60 * 1000, // 1 hour
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  batchProcessing: {
    enabled: true,
    requiredTier: "pro",
  },
  apiAccess: {
    enabled: true,
    requiredTier: "pro",
  },
  advancedAnalytics: {
    enabled: true,
    requiredTier: "enterprise",
  },
  whiteLabel: {
    enabled: false,
    requiredTier: "enterprise",
  },
} as const;

// Generation timeouts
export const TIMEOUTS = {
  generation: 5 * 60 * 1000, // 5 minutes
  upload: 30 * 1000, // 30 seconds
  api: 10 * 1000, // 10 seconds
} as const;
