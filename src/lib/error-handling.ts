// src/lib/error-handling.ts
import {
  API_ERROR_CODES,
  APIErrorCode,
  getErrorDetails,
  isRetryableError,
  requiresAuthentication,
} from "@/constants/api-errors";
import { toast } from "sonner";

/**
 * Standard API Response Types
 */
export interface APISuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface APIErrorResponse {
  success: false;
  error: string;
  code: APIErrorCode;
  details?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}

export type APIResponse<T = unknown> = APISuccessResponse<T> | APIErrorResponse;

/**
 * Error handling configuration
 */
interface ErrorHandlingConfig {
  showToast?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  onRetry?: () => void;
  onAuthRequired?: () => void;
  customMessage?: string;
}

/**
 * Enhanced error class for client-side error handling
 */
export class ClientAPIError extends Error {
  constructor(
    public response: APIErrorResponse,
    public retryCount: number = 0
  ) {
    super(response.error);
    this.name = "ClientAPIError";
  }

  get code(): APIErrorCode {
    return this.response.code;
  }

  get isRetryable(): boolean {
    return isRetryableError(this.code);
  }

  get requiresAuth(): boolean {
    return requiresAuthentication(this.code);
  }

  get details() {
    return getErrorDetails(this.code);
  }
}

/**
 * Main error handler for API responses
 */
export function handleAPIError(
  response: APIErrorResponse,
  config: ErrorHandlingConfig = {}
): ClientAPIError {
  const {
    showToast = true,
    autoRetry = false,
    maxRetries = 3,
    onRetry,
    onAuthRequired,
    customMessage,
  } = config;

  const error = new ClientAPIError(response);
  const errorDetails = error.details;

  // Handle authentication required errors
  if (error.requiresAuth && onAuthRequired) {
    onAuthRequired();
    if (showToast) {
      toast.error(errorDetails.message, {
        description: customMessage || errorDetails.message,
        action: {
          label: errorDetails.message,
          onClick: onAuthRequired,
        },
      });
    }
    return error;
  }

  // Handle retryable errors
  if (error.isRetryable && autoRetry && error.retryCount < maxRetries) {
    if (onRetry) {
      setTimeout(
        () => {
          onRetry();
          error.retryCount++;
        },
        Math.pow(2, error.retryCount) * 1000
      ); // Exponential backoff
    }
  }

  // Show toast notification
  if (showToast) {
    const isValidationError = error.code === API_ERROR_CODES.VALIDATION_ERROR;

    if (isValidationError && response.validationErrors) {
      // Show validation errors
      response.validationErrors.forEach((validationError) => {
        toast.error(`${validationError.field}: ${validationError.message}`);
      });
    } else {
      // Show general error
      toast.error(errorDetails.message, {
        description: customMessage || errorDetails.message,
        action:
          error.isRetryable && onRetry
            ? {
                label: "Retry",
                onClick: onRetry,
              }
            : undefined,
      });
    }
  }

  return error;
}

/**
 * Wrapper for fetch requests with automatic error handling
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {},
  config: ErrorHandlingConfig = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data: APIResponse<T> = await response.json();

    if (!data.success) {
      throw handleAPIError(data, config);
    }

    return data.data;
  } catch (error) {
    if (error instanceof ClientAPIError) {
      throw error;
    }

    // Handle network errors and other non-API errors
    const networkError: APIErrorResponse = {
      success: false,
      error: "Network error occurred",
      code: API_ERROR_CODES.SERVER_ERROR,
    };

    throw handleAPIError(networkError, config);
  }
}

/**
 * Hook for handling API errors in React components
 */
export function useErrorHandler() {
  const handleError = (error: unknown, config: ErrorHandlingConfig = {}) => {
    if (error instanceof ClientAPIError) {
      return error;
    }

    if (error instanceof Error) {
      const genericError: APIErrorResponse = {
        success: false,
        error: error.message,
        code: API_ERROR_CODES.SERVER_ERROR,
      };
      return handleAPIError(genericError, config);
    }

    const unknownError: APIErrorResponse = {
      success: false,
      error: "An unknown error occurred",
      code: API_ERROR_CODES.SERVER_ERROR,
    };

    return handleAPIError(unknownError, config);
  };

  return { handleError };
}

/**
 * Utility functions for specific error scenarios
 */
export const ErrorUtils = {
  /**
   * Check if error is authentication related
   */
  isAuthError(error: unknown): boolean {
    return error instanceof ClientAPIError && error.requiresAuth;
  },

  /**
   * Check if error is retryable
   */
  isRetryable(error: unknown): boolean {
    return error instanceof ClientAPIError && error.isRetryable;
  },

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: unknown): string {
    if (error instanceof ClientAPIError) {
      return error.details.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "An unexpected error occurred";
  },

  /**
   * Extract validation errors from API response
   */
  getValidationErrors(
    error: unknown
  ): Array<{ field: string; message: string }> {
    if (error instanceof ClientAPIError && error.response.validationErrors) {
      return error.response.validationErrors;
    }
    return [];
  },
};

/**
 * Pre-configured error handlers for common scenarios
 */
export const ErrorHandlers = {
  /**
   * Silent error handler - logs but doesn't show toast
   */
  silent: (config?: Partial<ErrorHandlingConfig>) => ({
    showToast: false,
    ...config,
  }),

  /**
   * Retry error handler - automatically retries on retryable errors
   */
  withRetry: (onRetry: () => void, config?: Partial<ErrorHandlingConfig>) => ({
    autoRetry: true,
    onRetry,
    ...config,
  }),

  /**
   * Auth error handler - redirects to login on auth errors
   */
  withAuth: (
    onAuthRequired: () => void,
    config?: Partial<ErrorHandlingConfig>
  ) => ({
    onAuthRequired,
    ...config,
  }),

  /**
   * Form error handler - handles validation errors for forms
   */
  forForm: (config?: Partial<ErrorHandlingConfig>) => ({
    showToast: true,
    ...config,
  }),
};
