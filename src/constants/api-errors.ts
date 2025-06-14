// src/constants/api-errors.ts
/**
 * API Error Codes - Centralized error codes for both client and server
 * These codes can be used for error handling, i18n, and consistent error responses
 */

export const API_ERROR_CODES = {
  // Authentication Errors (4xx)
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  USER_NOT_FOUND: "USER_NOT_FOUND",

  // Validation Errors (4xx)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  IMAGE_VALIDATION_ERROR: "IMAGE_VALIDATION_ERROR",

  // Resource Errors (4xx)
  INSUFFICIENT_TOKENS: "INSUFFICIENT_TOKENS",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  MODEL_ERROR: "MODEL_ERROR",

  // Service Errors (5xx)
  QUEUE_FULL: "QUEUE_FULL",
  SERVER_ERROR: "SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // OPEN AI ERRORs
  OPENAI_ERROR: "OPENAI_ERROR",
  IMAGE_GENERATION_ERROR: "IMAGE_GENERATION_ERROR",
} as const;

export type APIErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * HTTP Status Codes mapped to error types
 */
export const ERROR_STATUS_CODES = {
  [API_ERROR_CODES.AUTHENTICATION_REQUIRED]: 401,
  [API_ERROR_CODES.USER_NOT_FOUND]: 404,
  [API_ERROR_CODES.VALIDATION_ERROR]: 400,
  [API_ERROR_CODES.IMAGE_VALIDATION_ERROR]: 400,
  [API_ERROR_CODES.INSUFFICIENT_TOKENS]: 400,
  [API_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [API_ERROR_CODES.MODEL_ERROR]: 400,
  [API_ERROR_CODES.QUEUE_FULL]: 503,
  [API_ERROR_CODES.SERVER_ERROR]: 500,
  [API_ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [API_ERROR_CODES.OPENAI_ERROR]: 500,
} as const;

/**
 * User-friendly error messages for client-side display
 */
export const ERROR_MESSAGES = {
  [API_ERROR_CODES.AUTHENTICATION_REQUIRED]: {
    title: "Authentication Required",
    message: "Please sign in to continue with your request.",
    action: "Sign In",
  },
  [API_ERROR_CODES.USER_NOT_FOUND]: {
    title: "User Not Found",
    message:
      "Your user account could not be found. Please try signing in again.",
    action: "Sign In",
  },
  [API_ERROR_CODES.VALIDATION_ERROR]: {
    title: "Invalid Request",
    message:
      "The request contains invalid data. Please check your input and try again.",
    action: "Try Again",
  },
  [API_ERROR_CODES.IMAGE_VALIDATION_ERROR]: {
    title: "Image Validation Error",
    message:
      "There was an issue with one or more of your images. Please check the image URLs and try again.",
    action: "Check Images",
  },
  [API_ERROR_CODES.INSUFFICIENT_TOKENS]: {
    title: "Insufficient Tokens",
    message:
      "You don't have enough tokens to complete this request. Please purchase more tokens.",
    action: "Buy Tokens",
  },
  [API_ERROR_CODES.RATE_LIMIT_EXCEEDED]: {
    title: "Rate Limit Exceeded",
    message:
      "You've made too many requests recently. Please wait a moment before trying again.",
    action: "Wait & Retry",
  },
  [API_ERROR_CODES.MODEL_ERROR]: {
    title: "Model Error",
    message:
      "There was an issue with the selected AI model or its configuration. Please try a different model.",
    action: "Change Model",
  },
  [API_ERROR_CODES.QUEUE_FULL]: {
    title: "Service Busy",
    message:
      "Our generation queue is currently full. Please try again in a few moments.",
    action: "Try Again",
  },
  [API_ERROR_CODES.SERVER_ERROR]: {
    title: "Server Error",
    message:
      "An unexpected error occurred on our servers. Please try again later.",
    action: "Try Again",
  },
  [API_ERROR_CODES.SERVICE_UNAVAILABLE]: {
    title: "Service Unavailable",
    message: "The service is temporarily unavailable. Please try again later.",
    action: "Try Again",
  },
  [API_ERROR_CODES.OPENAI_ERROR]: {
    title: "AI Service Error",
    message:
      "There was an issue with the AI generation service. Please try again.",
    action: "Try Again",
  },
} as const;

/**
 * Error categories for grouping and analytics
 */
export const ERROR_CATEGORIES = {
  AUTHENTICATION: "authentication",
  VALIDATION: "validation",
  RESOURCE: "resource",
  SERVICE: "service",
  SERVER: "server",
} as const;

export const ERROR_CATEGORY_MAP = {
  [API_ERROR_CODES.AUTHENTICATION_REQUIRED]: ERROR_CATEGORIES.AUTHENTICATION,
  [API_ERROR_CODES.USER_NOT_FOUND]: ERROR_CATEGORIES.AUTHENTICATION,
  [API_ERROR_CODES.VALIDATION_ERROR]: ERROR_CATEGORIES.VALIDATION,
  [API_ERROR_CODES.IMAGE_VALIDATION_ERROR]: ERROR_CATEGORIES.VALIDATION,
  [API_ERROR_CODES.INSUFFICIENT_TOKENS]: ERROR_CATEGORIES.RESOURCE,
  [API_ERROR_CODES.RATE_LIMIT_EXCEEDED]: ERROR_CATEGORIES.RESOURCE,
  [API_ERROR_CODES.MODEL_ERROR]: ERROR_CATEGORIES.VALIDATION,
  [API_ERROR_CODES.QUEUE_FULL]: ERROR_CATEGORIES.SERVICE,
  [API_ERROR_CODES.SERVER_ERROR]: ERROR_CATEGORIES.SERVER,
  [API_ERROR_CODES.SERVICE_UNAVAILABLE]: ERROR_CATEGORIES.SERVICE,
  [API_ERROR_CODES.OPENAI_ERROR]: ERROR_CATEGORIES.SERVICE,
} as const;

/**
 * Helper function to check if an error is retryable
 */
export function isRetryableError(code: APIErrorCode): boolean {
  const retryableCodes: APIErrorCode[] = [
    API_ERROR_CODES.RATE_LIMIT_EXCEEDED,
    API_ERROR_CODES.QUEUE_FULL,
    API_ERROR_CODES.SERVER_ERROR,
    API_ERROR_CODES.SERVICE_UNAVAILABLE,
  ];
  return retryableCodes.includes(code);
}

/**
 * Helper function to check if an error requires authentication
 */
export function requiresAuthentication(code: APIErrorCode): boolean {
  const authCodes: APIErrorCode[] = [
    API_ERROR_CODES.AUTHENTICATION_REQUIRED,
    API_ERROR_CODES.USER_NOT_FOUND,
  ];
  return authCodes.includes(code);
}
