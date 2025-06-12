// src/hooks/use-api.ts
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API, APIErrorHandling, isAPIError } from "@/services/api";
import { ClientAPIError, useErrorHandler } from "@/lib/error-handling";
import { API_ERROR_CODES } from "@/constants/api-errors";
import { FileCategory } from "@/convex/types";

/**
 * Hook for API state management
 */
interface UseAPIState<T> {
  data: T | null;
  loading: boolean;
  error: ClientAPIError | null;
}

/**
 * Hook for generation API
 */
export function useGenerationAPI() {
  const [state, setState] = useState<UseAPIState<unknown>>({
    data: null,
    loading: false,
    error: null,
  });

  const { handleError } = useErrorHandler();

  const createGeneration = useCallback(
    async (data: {
      productImages: string[];
      modelImages?: string[];
      model: string;
      style: string;
      quality: string;
      aspectRatio: string;
      customPrompt?: string;
      parameters?: Record<string, unknown>;
    }) => {
      setState({ data: null, loading: true, error: null });

      try {
        const result = await API.generation.create(data);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        const apiError = handleError(error, {
          showToast: true,
          onAuthRequired: APIErrorHandling.handleAuthError,
        });

        setState({ data: null, loading: false, error: apiError });

        // Handle specific error cases
        if (isAPIError.insufficientTokens(apiError)) {
          APIErrorHandling.handleTokenError();
        } else if (isAPIError.rateLimitExceeded(apiError)) {
          APIErrorHandling.handleRateLimit(() => createGeneration(data));
        }

        throw apiError;
      }
    },
    [handleError]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    createGeneration,
    reset,
  };
}

/**
 * Hook for upload API
 */
export function useUploadAPI() {
  const [state, setState] = useState<UseAPIState<unknown>>({
    data: null,
    loading: false,
    error: null,
  });

  const { handleError } = useErrorHandler();

  const uploadMultipleImages = useCallback(
    async (files: File[], category: FileCategory = "product_image") => {
      setState({ data: null, loading: true, error: null });

      try {
        const result = await API.upload.uploadMultipleImages(files, category);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        const apiError = handleError(error, {
          showToast: true,
          onAuthRequired: APIErrorHandling.handleAuthError,
        });

        setState({ data: null, loading: false, error: apiError });
        throw apiError;
      }
    },
    [handleError]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    uploadMultipleImages,
    reset,
  };
}

/**
 * Hook for user profile API
 */
export function useUserAPI() {
  const [state, setState] = useState<UseAPIState<unknown>>({
    data: null,
    loading: false,
    error: null,
  });

  const { handleError } = useErrorHandler();

  const updateProfile = useCallback(
    async (data: { name: string; email: string }) => {
      setState({ data: null, loading: true, error: null });

      try {
        const result = await API.user.updateProfile(data);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        const apiError = handleError(error, {
          showToast: true,
          onAuthRequired: APIErrorHandling.handleAuthError,
        });

        setState({ data: null, loading: false, error: apiError });

        // Handle validation errors
        if (isAPIError.validationError(apiError)) {
          APIErrorHandling.handleValidationError(
            apiError.response.validationErrors || []
          );
        }

        throw apiError;
      }
    },
    [handleError]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    updateProfile,
    reset,
  };
}

/**
 * Generic API hook for custom endpoints
 */
export function useCustomAPI<T = unknown>() {
  const [state, setState] = useState<UseAPIState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const { handleError } = useErrorHandler();

  const request = useCallback(
    async (url: string, options: RequestInit = {}): Promise<T> => {
      setState({ data: null, loading: true, error: null });

      try {
        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
          ...options,
        });

        const data = await response.json();

        if (!data.success) {
          throw new ClientAPIError(data);
        }

        setState({ data: data.data, loading: false, error: null });
        return data.data;
      } catch (error) {
        const apiError = handleError(error, {
          showToast: true,
          onAuthRequired: APIErrorHandling.handleAuthError,
        });

        setState({ data: null, loading: false, error: apiError });
        throw apiError;
      }
    },
    [handleError]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    request,
    reset,
  };
}

/**
 * Utility hook for error handling across components
 */
export function useAPIErrorHandler() {
  const router = useRouter();

  const handleAPIError = useCallback(
    (error: unknown) => {
      if (error instanceof ClientAPIError) {
        switch (error.code) {
          case API_ERROR_CODES.AUTHENTICATION_REQUIRED:
            router.push("/signin");
            break;
          case API_ERROR_CODES.INSUFFICIENT_TOKENS:
            router.push("/dashboard?tab=tokens");
            break;
          case API_ERROR_CODES.RATE_LIMIT_EXCEEDED:
            // Show rate limit message - already handled by toast
            break;
          case API_ERROR_CODES.QUEUE_FULL:
            // Show queue full message - already handled by toast
            break;
          default:
            // Generic error handling - already handled by toast
            break;
        }
      }
    },
    [router]
  );

  return { handleAPIError };
}
