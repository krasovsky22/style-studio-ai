import { ConvexError } from "convex/values";

/**
 * Create a ConvexError with a custom message
 */
export function createError(
  message: string,
  code?: string
): ConvexError<{ message: string; code?: string }> {
  return new ConvexError({ message, code });
}
