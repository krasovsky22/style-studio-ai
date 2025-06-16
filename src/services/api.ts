// src/services/api.ts
import { apiRequest, ErrorHandlers } from "@/lib/error-handling";
import { API_ERROR_CODES } from "@/constants/api-errors";
import { FileCategory } from "@/convex/types";

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Generation endpoints
  GENERATE: "/api/generate",
  GENERATION_CREATE: "/api/generation/create",

  // Upload endpoints
  UPLOAD: "/api/upload",

  // User endpoints
  USER_PROFILE: "/api/user/profile",
} as const;

/**
 * Generation API Service
 */
export const GenerationService = {
  /**
   * Create a new generation record
   */
  async createRecord(data: {
    productImages: string[];
    modelImages?: string[];
    model: string;
    style: string;
    quality: string;
    aspectRatio: string;
    customPrompt?: string;
    parameters?: Record<string, unknown>;
  }) {
    return apiRequest(
      API_ENDPOINTS.GENERATION_CREATE,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      ErrorHandlers.forForm({
        customMessage:
          "Failed to create generation record. Please check your inputs and try again.",
      })
    );
  },

  /**
   * Process an existing generation
   */
  async processGeneration(generationId: string) {
    return apiRequest(
      API_ENDPOINTS.GENERATE,
      {
        method: "POST",
        body: JSON.stringify({ generationId }),
      },
      ErrorHandlers.forForm({
        customMessage: "Failed to process generation. Please try again.",
      })
    );
  },

  /**
   * Create a new generation request (legacy - for backward compatibility)
   */
  async create(data: {
    productImages: string[];
    modelImages?: string[];
    model: string;
    style: string;
    quality: string;
    aspectRatio: string;
    customPrompt?: string;
    parameters?: Record<string, unknown>;
  }) {
    return apiRequest(
      API_ENDPOINTS.GENERATE,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      ErrorHandlers.forForm({
        customMessage:
          "Failed to start generation. Please check your inputs and try again.",
      })
    );
  },
};

/**
 * Upload API Service
 */
export const UploadService = {
  /**
   * Upload an image file
   */
  async uploadImage(file: File, category: FileCategory = "product_image") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    return apiRequest(
      API_ENDPOINTS.UPLOAD,
      {
        method: "POST",
        body: formData,
        headers: {}, // Don't set Content-Type for FormData
      },
      ErrorHandlers.forForm({
        customMessage:
          "Failed to upload image. Please check the file and try again.",
      })
    );
  },

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    files: File[],
    category: FileCategory = "product_image"
  ) {
    const uploadPromises = files.map((file) =>
      this.uploadImage(file, category)
    );

    return Promise.all(uploadPromises);
  },
};

/**
 * User API Service
 */
export const UserService = {
  /**
   * Update user profile
   */
  async updateProfile(data: { name: string; email: string }) {
    return apiRequest(
      API_ENDPOINTS.USER_PROFILE,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      ErrorHandlers.forForm({
        customMessage: "Failed to update profile. Please try again.",
      })
    );
  },
};

/**
 * Combined API service object
 */
export const API = {
  generation: GenerationService,
  upload: UploadService,
  user: UserService,
};

/**
 * Common error handling patterns for the frontend
 */
export const APIErrorHandling = {
  /**
   * Handle authentication errors by redirecting to sign-in
   */
  handleAuthError: () => {
    window.location.href = "/signin";
  },

  /**
   * Handle token insufficient errors by redirecting to purchase
   */
  handleTokenError: () => {
    window.location.href = "/dashboard?tab=tokens";
  },

  /**
   * Handle rate limit errors with exponential backoff
   */
  handleRateLimit: (retryCallback: () => void) => {
    setTimeout(retryCallback, 60000); // Wait 1 minute before retrying
  },

  /**
   * Handle validation errors by focusing on the first invalid field
   */
  handleValidationError: (
    validationErrors: Array<{ field: string; message: string }>
  ) => {
    if (validationErrors.length > 0) {
      const firstErrorField = validationErrors[0].field;
      const element = document.querySelector(
        `[name="${firstErrorField}"]`
      ) as HTMLElement;
      element?.focus();
    }
  },
};

/**
 * Type-safe error checking utilities
 */
interface ErrorWithResponse {
  response?: {
    code?: string;
  };
}

export const isAPIError = {
  authenticationRequired: (error: unknown) =>
    error instanceof Error &&
    "response" in error &&
    (error as ErrorWithResponse).response?.code ===
      API_ERROR_CODES.AUTHENTICATION_REQUIRED,

  insufficientTokens: (error: unknown) =>
    error instanceof Error &&
    "response" in error &&
    (error as ErrorWithResponse).response?.code ===
      API_ERROR_CODES.INSUFFICIENT_TOKENS,

  rateLimitExceeded: (error: unknown) =>
    error instanceof Error &&
    "response" in error &&
    (error as ErrorWithResponse).response?.code ===
      API_ERROR_CODES.RATE_LIMIT_EXCEEDED,

  validationError: (error: unknown) =>
    error instanceof Error &&
    "response" in error &&
    (error as ErrorWithResponse).response?.code ===
      API_ERROR_CODES.VALIDATION_ERROR,

  queueFull: (error: unknown) =>
    error instanceof Error &&
    "response" in error &&
    (error as ErrorWithResponse).response?.code === API_ERROR_CODES.QUEUE_FULL,

  serverError: (error: unknown) =>
    error instanceof Error &&
    "response" in error &&
    (error as ErrorWithResponse).response?.code ===
      API_ERROR_CODES.SERVER_ERROR,
};
