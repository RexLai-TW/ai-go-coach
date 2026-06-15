import { getLlmSettings } from "../db";
import type { LLMOverrides } from "../_core/llm";

export interface ResolvedLLMConfig {
  /** Endpoint/key overrides, or undefined to use the built-in Forge API. */
  overrides?: LLMOverrides;
  /** Model name to request, or undefined to let the provider pick its default. */
  model?: string;
}

/** Default OpenAI-compatible base URLs for preset providers (which omit a custom URL). */
const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  minimax: "https://api.minimax.chat/v1",
};

/**
 * Resolve the effective LLM configuration for a user: use their saved
 * OpenAI-compatible settings when enabled and complete, otherwise fall back
 * to the built-in Forge API.
 */
export async function getUserLLMConfig(userId: number): Promise<ResolvedLLMConfig> {
  const settings = await getLlmSettings(userId);

  if (!settings || settings.isEnabled !== 1 || !settings.apiKey) {
    return {};
  }

  // Custom providers supply their own base URL; presets use a known default.
  const baseUrl = settings.apiBaseUrl || PROVIDER_BASE_URLS[settings.provider];
  if (!baseUrl) {
    return {};
  }

  return {
    overrides: { apiBaseUrl: baseUrl, apiKey: settings.apiKey },
    model: settings.modelName ?? undefined,
  };
}
