// src/services/user-token-handler.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { API_ERROR_CODES, APIErrorCode } from "@/constants/api-errors";

// Custom Error Class for Token Operations
export class TokenError extends Error {
  constructor(
    message: string,
    public code: APIErrorCode,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = "TokenError";
    this.statusCode = 400; // Default to 400 Bad Request
  }
}

// Token validation result interface
export interface TokenValidationResult {
  user: {
    _id: Id<"users">;
    email: string;
    name?: string;
    tokenBalance: number;
    totalTokensPurchased: number;
    totalTokensUsed: number;
  };
  hasValidBalance: boolean;
  availableTokens: number;
  requiredTokens: number;
  shortfall?: number;
}

// Token transaction interface
export interface TokenTransaction {
  userId: Id<"users">;
  amount: number;
  type: "debit" | "credit";
  reason: string;
  generationId?: Id<"generations">;
  metadata?: Record<string, unknown>;
}

/**
 * User Token Handler Service
 * Handles all token-related operations including validation, deduction, and refunds
 */
export class UserTokenHandler {
  private convex: ConvexHttpClient;

  constructor() {
    this.convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  }

  /**
   * Validates if user has sufficient tokens for a given cost
   * @param userId - User ID
   * @param requiredTokens - Number of tokens required
   * @returns Token validation result
   * @throws TokenError if user not found or insufficient tokens
   */
  async validateUserTokens(
    userId: Id<"users">,
    requiredTokens: number
  ): Promise<TokenValidationResult> {
    try {
      // Get user from Convex
      const user = await this.convex.query(api.users.getUser, {
        userId,
      });

      if (!user) {
        throw new TokenError(
          "User not found",
          API_ERROR_CODES.AUTHENTICATION_REQUIRED
        );
      }

      const hasValidBalance = user.tokenBalance >= requiredTokens;
      const shortfall = hasValidBalance
        ? undefined
        : requiredTokens - user.tokenBalance;

      if (!hasValidBalance) {
        throw new TokenError(
          `Insufficient tokens. Required: ${requiredTokens}, Available: ${user.tokenBalance}`,
          API_ERROR_CODES.INSUFFICIENT_TOKENS,
          400,
          `You need ${shortfall} more tokens to proceed. Consider purchasing additional tokens.`
        );
      }

      return {
        user,
        hasValidBalance,
        availableTokens: user.tokenBalance,
        requiredTokens,
        shortfall,
      };
    } catch (error) {
      if (error instanceof TokenError) {
        throw error;
      }

      console.error("Token validation error:", error);
      throw new TokenError(
        "Failed to validate user tokens",
        API_ERROR_CODES.SERVER_ERROR
      );
    }
  }

  /**
   * Deducts tokens from user balance
   * @param userId - User ID
   * @param amount - Number of tokens to deduct
   * @param reason - Reason for deduction
   * @param generationId - Optional generation ID
   * @returns Updated user token balance
   */
  async deductTokens(
    userId: Id<"users">,
    amount: number,
    generationId: Id<"generations">,
    reason: string = "AI generation"
  ): Promise<number> {
    try {
      // Validate token availability first
      await this.validateUserTokens(userId, amount);

      // Deduct tokens atomically
      const updatedBalance = await this.convex.mutation(
        api.tokens.deductTokens,
        {
          userId,
          amount,
          reason,
          generationId,
        }
      );

      // Log the transaction using existing logUserAction
      await this.logTokenTransaction({
        userId,
        amount: -amount, // Negative for deduction
        type: "debit",
        reason,
        generationId: generationId,
        metadata: {
          timestamp: Date.now(),
          balanceAfter: updatedBalance,
        },
      });

      return updatedBalance;
    } catch (error) {
      if (error instanceof TokenError) {
        throw error;
      }

      console.error("Token deduction error:", error);
      throw new TokenError(
        "Failed to deduct tokens",
        API_ERROR_CODES.SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Refunds tokens to user balance (for failed generations)
   * @param userId - User ID
   * @param amount - Number of tokens to refund
   * @param reason - Reason for refund
   * @param generationId - Optional generation ID
   * @returns Updated user token balance
   */
  async refundTokens(
    userId: Id<"users">,
    amount: number,
    reason: string,
    generationId?: Id<"generations">
  ): Promise<number> {
    try {
      // Add tokens back to user balance
      const updatedBalance = await this.convex.mutation(api.tokens.addTokens, {
        userId,
        amount,
        reason,
        generationId,
      });

      // Log the refund transaction
      await this.logTokenTransaction({
        userId,
        amount, // Positive for credit/refund
        type: "credit",
        reason,
        generationId,
        metadata: {
          timestamp: Date.now(),
          balanceAfter: updatedBalance,
          refund: true,
        },
      });

      return updatedBalance;
    } catch (error) {
      console.error("Token refund error:", error);
      throw new TokenError(
        "Failed to refund tokens",
        API_ERROR_CODES.SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Gets current user token balance
   * @param userId - User ID
   * @returns User token balance
   */
  async getUserTokenBalance(userId: string): Promise<number> {
    try {
      const user = await this.convex.query(api.users.getUser, {
        userId: userId as Id<"users">,
      });

      if (!user) {
        throw new TokenError(
          "User not found",
          API_ERROR_CODES.AUTHENTICATION_REQUIRED,
          401
        );
      }

      return user.tokenBalance;
    } catch (error) {
      if (error instanceof TokenError) {
        throw error;
      }

      console.error("Get token balance error:", error);
      throw new TokenError(
        "Failed to get user token balance",
        API_ERROR_CODES.SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Gets user token usage statistics
   * @param userId - User ID
   * @returns Token usage statistics
   */
  async getUserTokenStats(userId: string) {
    try {
      const user = await this.convex.query(api.users.getUser, {
        userId: userId as Id<"users">,
      });

      if (!user) {
        throw new TokenError(
          "User not found",
          API_ERROR_CODES.AUTHENTICATION_REQUIRED,
          401
        );
      }

      return {
        currentBalance: user.tokenBalance,
        totalPurchased: user.totalTokensPurchased,
        totalUsed: user.totalTokensUsed,
        remainingTokens: user.tokenBalance,
        usagePercentage:
          user.totalTokensPurchased > 0
            ? Math.round(
                (user.totalTokensUsed / user.totalTokensPurchased) * 100
              )
            : 0,
      };
    } catch (error) {
      if (error instanceof TokenError) {
        throw error;
      }

      console.error("Get token stats error:", error);
      throw new TokenError(
        "Failed to get user token statistics",
        API_ERROR_CODES.SERVER_ERROR,
        500
      );
    }
  }

  /**
   * Checks if user can afford a specific operation
   * @param userId - User ID
   * @param cost - Token cost of operation
   * @returns Boolean indicating if user can afford the operation
   */
  async canAffordOperation(userId: string, cost: number): Promise<boolean> {
    try {
      const balance = await this.getUserTokenBalance(userId);
      return balance >= cost;
    } catch {
      return false;
    }
  }

  /**
   * Logs token transaction for audit trail using existing logUserAction
   * @param transaction - Token transaction details
   */
  private async logTokenTransaction(
    transaction: TokenTransaction
  ): Promise<void> {
    try {
      const action =
        transaction.type === "debit"
          ? "generation_started"
          : "generation_failed";

      await this.convex.mutation(api.usage.logUserAction, {
        userId: transaction.userId,
        action,
        metadata: {
          tokensUsed: Math.abs(transaction.amount),
          generationId: transaction.generationId,
        },
      });
    } catch (error) {
      // Log error but don't throw - transaction logging shouldn't fail the main operation
      console.error("Failed to log token transaction:", error);
    }
  }
}

// Export singleton instance
export const userTokenHandler = new UserTokenHandler();

// Export helper functions for common operations
export const tokenService = {
  /**
   * Quick validation check for token availability
   */
  async hasEnoughTokens(
    userId: Id<"users">,
    requiredTokens: number
  ): Promise<boolean> {
    try {
      await userTokenHandler.validateUserTokens(userId, requiredTokens);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get user's current token balance
   */
  async getBalance(userId: string): Promise<number> {
    return userTokenHandler.getUserTokenBalance(userId);
  },

  /**
   * Deduct tokens for a generation
   */
  async deductForGeneration(
    userId: Id<"users">,
    amount: number,
    generationId: Id<"generations">
  ): Promise<number> {
    return userTokenHandler.deductTokens(
      userId,
      amount,
      generationId,
      "AI generation"
    );
  },

  /**
   * Refund tokens for a failed generation
   */
  async refundForFailedGeneration(
    userId: Id<"users">,
    amount: number,
    generationId: Id<"generations">
  ): Promise<number> {
    return userTokenHandler.refundTokens(
      userId,
      amount,
      "Generation failed - refund",
      generationId
    );
  },
};
