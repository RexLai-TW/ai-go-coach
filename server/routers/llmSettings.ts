import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getLlmSettings, saveLlmSettings, deleteLlmSettings } from "../db";
import { TRPCError } from "@trpc/server";

/**
 * LLM Settings Router
 * Manages custom OpenAI-compatible API configurations
 */
export const llmSettingsRouter = router({
  /**
   * Get current LLM settings for the user
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    try {
      const settings = await getLlmSettings(ctx.user.id);
      
      // Don't expose API key to client
      if (settings) {
        return {
          ...settings,
          apiKey: settings.apiKey ? "***" : null,
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching LLM settings:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch LLM settings",
      });
    }
  }),

  /**
   * Save or update LLM settings
   */
  save: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["openai", "custom", "deepseek", "minimax"]),
        apiBaseUrl: z.string().url().optional(),
        apiKey: z.string().optional(),
        modelName: z.string().optional(),
        isEnabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate required fields for custom provider
        if (input.provider === "custom") {
          if (!input.apiBaseUrl || !input.apiKey || !input.modelName) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Custom provider requires apiBaseUrl, apiKey, and modelName",
            });
          }
        }

        const settings = await saveLlmSettings(ctx.user.id, {
          provider: input.provider,
          apiBaseUrl: input.apiBaseUrl,
          apiKey: input.apiKey,
          modelName: input.modelName,
          isEnabled: input.isEnabled ? 1 : 0,
        });

        return {
          ...settings,
          apiKey: "***",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Error saving LLM settings:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save LLM settings",
        });
      }
    }),

  /**
   * Delete LLM settings (revert to default)
   */
  delete: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await deleteLlmSettings(ctx.user.id);
      return { success: true };
    } catch (error) {
      console.error("Error deleting LLM settings:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete LLM settings",
      });
    }
  }),

  /**
   * Test LLM connection
   */
  test: protectedProcedure
    .input(
      z.object({
        apiBaseUrl: z.string().url(),
        apiKey: z.string(),
        modelName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Test connection by making a simple API call
        const response = await fetch(`${input.apiBaseUrl}/models`, {
          headers: {
            Authorization: `Bearer ${input.apiKey}`,
          },
        });

        if (!response.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `API returned status ${response.status}`,
          });
        }

        return { success: true, message: "Connection successful" };
      } catch (error) {
        console.error("Error testing LLM connection:", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Connection test failed",
        });
      }
    }),
});
