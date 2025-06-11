// Helper service for combining generation workflows
import {
  GenerationOptions,
  PromptResult,
  GenerationStatus,
} from "@/types/generation";
import { promptEngineer } from "@/lib/prompt-engineering";
import { generationService } from "@/services/generation";

/**
 * Unified generation workflow service
 * Combines prompt engineering and generation service for easy use in API routes
 */
export class GenerationWorkflow {
  /**
   * Complete generation workflow: validate, generate prompt, and start generation
   */
  async startGeneration(options: GenerationOptions) {
    try {
      // Generate optimized prompt
      const promptResult = promptEngineer.generatePrompt(options);

      // Start generation with the options and prompt
      const generationResult =
        await generationService.createGeneration(options);

      return {
        ...generationResult,
        promptResult,
      };
    } catch (error) {
      console.error("Generation workflow failed:", error);
      throw new Error(`Failed to start generation: ${error}`);
    }
  }

  /**
   * Get generation status
   */
  async getStatus(replicateId: string) {
    return generationService.getGenerationStatus(replicateId);
  }

  /**
   * Poll generation until completion
   */
  async pollGeneration(
    replicateId: string,
    onUpdate?: (status: GenerationStatus) => void
  ) {
    return generationService.pollGeneration(replicateId, onUpdate);
  }

  /**
   * Cancel generation
   */
  async cancelGeneration(replicateId: string) {
    return generationService.cancelGeneration(replicateId);
  }

  /**
   * Retry failed generation
   */
  async retryGeneration(options: GenerationOptions, maxRetries?: number) {
    return generationService.retryGeneration(options, maxRetries);
  }

  /**
   * Estimate token cost
   */
  estimateTokenCost(options: GenerationOptions) {
    return generationService.estimateTokenCost(options);
  }

  /**
   * Get available models
   */
  getAvailableModels() {
    return generationService.getAvailableModels();
  }

  /**
   * Generate prompt only (useful for preview)
   */
  generatePrompt(options: GenerationOptions): PromptResult {
    return promptEngineer.generatePrompt(options);
  }

  /**
   * Validate prompt
   */
  validatePrompt(prompt: string) {
    return promptEngineer.validatePrompt(prompt);
  }
}

// Export singleton instance
export const generationWorkflow = new GenerationWorkflow();

// Export individual methods for convenience
export const {
  startGeneration,
  getStatus,
  pollGeneration,
  cancelGeneration,
  retryGeneration,
  estimateTokenCost,
  getAvailableModels,
  generatePrompt,
  validatePrompt,
} = generationWorkflow;
