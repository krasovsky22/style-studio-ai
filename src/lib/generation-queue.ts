import { ConvexError } from "convex/values";
import { GenerationStatus, QueueInfo } from "@/types/generation";

/**
 * Generation queue management system
 * Handles queuing, processing, and status tracking of AI generations
 */
export class GenerationQueue {
  private processingGenerations = new Map<string, NodeJS.Timeout>();
  private maxConcurrentGenerations = 5;
  private retryAttempts = 3;
  private retryDelay = 2000; // 2 seconds base delay

  /**
   * Add generation to processing queue
   */
  async queueGeneration(
    generationId: string,
    processFunction: () => Promise<void>
  ): Promise<void> {
    try {
      // Check if already processing
      if (this.processingGenerations.has(generationId)) {
        throw new Error("Generation already in queue");
      }

      // Check queue capacity
      if (this.processingGenerations.size >= this.maxConcurrentGenerations) {
        throw new Error("Queue is full, please try again later");
      }

      // Start processing with timeout
      const timeout = setTimeout(async () => {
        try {
          await processFunction();
        } catch (error) {
          console.error(`Generation ${generationId} failed:`, error);
          await this.handleGenerationError(generationId, error as Error);
        } finally {
          this.processingGenerations.delete(generationId);
        }
      }, 100); // Start immediately

      this.processingGenerations.set(generationId, timeout);
    } catch (error) {
      console.error("Failed to queue generation:", error);
      throw error;
    }
  }

  /**
   * Remove generation from queue
   */
  async dequeueGeneration(generationId: string): Promise<void> {
    const timeout = this.processingGenerations.get(generationId);
    if (timeout) {
      clearTimeout(timeout);
      this.processingGenerations.delete(generationId);
    }
  }

  /**
   * Get current queue information
   */
  getQueueInfo(): QueueInfo {
    return {
      position: 1, // Simplified - in reality would calculate actual position
      estimatedWaitTime: this.estimateWaitTime(),
      activeGenerations: this.processingGenerations.size,
    };
  }

  /**
   * Check if generation is in queue
   */
  isInQueue(generationId: string): boolean {
    return this.processingGenerations.has(generationId);
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.processingGenerations.size;
  }

  /**
   * Handle generation errors with retry logic
   */
  private async handleGenerationError(
    generationId: string,
    error: Error
  ): Promise<void> {
    console.error(`Generation ${generationId} encountered error:`, error);

    // Here you would implement retry logic, error reporting, etc.
    // For now, we'll just log the error

    // In a real implementation, you might:
    // 1. Check if error is retryable
    // 2. Increment retry count
    // 3. Re-queue if under retry limit
    // 4. Update generation status in database
    // 5. Notify user of failure
  }

  /**
   * Estimate wait time based on current queue
   */
  private estimateWaitTime(): number {
    const queueSize = this.processingGenerations.size;
    const averageProcessingTime = 60; // 60 seconds average

    return queueSize * averageProcessingTime;
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    activeGenerations: number;
    maxConcurrent: number;
    queueCapacity: number;
    estimatedWaitTime: number;
  } {
    return {
      activeGenerations: this.processingGenerations.size,
      maxConcurrent: this.maxConcurrentGenerations,
      queueCapacity:
        this.maxConcurrentGenerations - this.processingGenerations.size,
      estimatedWaitTime: this.estimateWaitTime(),
    };
  }

  /**
   * Clean up completed or failed generations
   */
  cleanup(): void {
    // Remove any stale entries (this is a safety measure)
    // In a real implementation, you'd have more sophisticated cleanup logic
    console.log(
      `Queue cleanup: ${this.processingGenerations.size} active generations`
    );
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;

      console.log(`Attempt ${attempt} failed, retrying in ${totalDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError!;
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    // Check if under limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  /**
   * Get time until next request is allowed
   */
  getRetryAfter(): number {
    if (this.requests.length === 0) return 0;

    const oldestRequest = Math.min(...this.requests);
    const nextAvailable = oldestRequest + this.windowMs;
    const now = Date.now();

    return Math.max(0, nextAvailable - now);
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}

/**
 * Generation status tracker
 */
export class StatusTracker {
  private statuses = new Map<string, GenerationStatus>();

  /**
   * Update generation status
   */
  updateStatus(generationId: string, status: Partial<GenerationStatus>): void {
    const current = this.statuses.get(generationId) || {
      id: generationId,
      status: "pending",
    };

    const updated = { ...current, ...status };
    this.statuses.set(generationId, updated);
  }

  /**
   * Get generation status
   */
  getStatus(generationId: string): GenerationStatus | undefined {
    return this.statuses.get(generationId);
  }

  /**
   * Remove status tracking
   */
  removeStatus(generationId: string): void {
    this.statuses.delete(generationId);
  }

  /**
   * Get all active statuses
   */
  getAllStatuses(): GenerationStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Clean up old statuses
   */
  cleanup(): void {
    // In a real implementation, you'd track timestamps and clean up old entries
    console.log(`Status cleanup: ${this.statuses.size} tracked statuses`);
  }
}

// Export singleton instances
export const generationQueue = new GenerationQueue();
export const statusTracker = new StatusTracker();
export const rateLimiter = new RateLimiter();

// Utility functions
export function createGenerationError(message: string, code?: string) {
  return new ConvexError({
    message,
    code: code || "GENERATION_ERROR",
  });
}

export function isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    "timeout",
    "rate limit",
    "temporary",
    "server error",
    "503",
    "502",
    "504",
  ];

  const errorMessage = error.message.toLowerCase();
  return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
}

export function getErrorCategory(
  error: Error
): "user" | "system" | "api" | "unknown" {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes("invalid") || errorMessage.includes("required")) {
    return "user";
  }

  if (errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
    return "api";
  }

  if (errorMessage.includes("server") || errorMessage.includes("timeout")) {
    return "system";
  }

  return "unknown";
}

/**
 * Priority queue for managing generation priorities
 */
export class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];

  /**
   * Add item with priority
   */
  enqueue(item: T, priority: number = 0): void {
    const newItem = { item, priority };

    // Find insertion point (higher priority first)
    let inserted = false;
    for (let i = 0; i < this.items.length; i++) {
      if (priority > this.items[i].priority) {
        this.items.splice(i, 0, newItem);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.items.push(newItem);
    }
  }

  /**
   * Remove and return highest priority item
   */
  dequeue(): T | undefined {
    const item = this.items.shift();
    return item?.item;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Peek at highest priority item without removing
   */
  peek(): T | undefined {
    return this.items[0]?.item;
  }
}
