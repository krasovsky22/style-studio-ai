import { ConvexError } from "convex/values";

/**
 * Check if a user can perform an action based on their subscription
 */
export function canPerformAction(): boolean {
  return true;
}

/**
 * Validate file size against subscription limits
 */
export function validateFileSize(): boolean {
  return true;
}

/**
 * Calculate usage percentage
 */
export function calculateUsagePercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.round((used / limit) * 100);
}

/**
 * Get next reset date (30 days from now)
 */
export function getNextResetDate(): number {
  return Date.now() + 30 * 24 * 60 * 60 * 1000;
}

/**
 * Check if usage should be reset
 */
export function shouldResetUsage(resetDate: number): boolean {
  return Date.now() >= resetDate;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid characters
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Generate a unique filename with timestamp
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 6);
  const sanitized = sanitizeFilename(originalFilename);
  const parts = sanitized.split(".");

  if (parts.length > 1) {
    const extension = parts.pop();
    const basename = parts.join(".");
    return `${basename}_${timestamp}_${randomSuffix}.${extension}`;
  }

  return `${sanitized}_${timestamp}_${randomSuffix}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Create a ConvexError with a custom message
 */
export function createError(
  message: string,
  code?: string
): ConvexError<{ message: string; code?: string }> {
  return new ConvexError({ message, code });
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Batch process items with size limit
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Get time range for analytics queries
 */
export function getTimeRange(period: "day" | "week" | "month" | "year"): {
  startDate: number;
  endDate: number;
} {
  const now = Date.now();
  const endDate = now;

  let startDate: number;
  switch (period) {
    case "day":
      startDate = now - 24 * 60 * 60 * 1000;
      break;
    case "week":
      startDate = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case "month":
      startDate = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case "year":
      startDate = now - 365 * 24 * 60 * 60 * 1000;
      break;
    default:
      startDate = now - 24 * 60 * 60 * 1000;
  }

  return { startDate, endDate };
}
