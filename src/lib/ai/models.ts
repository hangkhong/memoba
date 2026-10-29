import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { createProviderRegistry, customProvider, defaultSettingsMiddleware, wrapLanguageModel } from "ai";
import { readAIConfig } from "../config/env.ts";
import { createEmbeddingAdapter } from "./embeddings.ts";

export function configuredModels(environment: unknown = process.env) {
  const config = readAIConfig(environment);
  if (config.kind !== "configured") throw new Error("AI_UNAVAILABLE");
  const value = config.value;
  const google = createGoogleGenerativeAI({ apiKey: value.GOOGLE_GENERATIVE_AI_API_KEY });
  const openai = createOpenAI({ apiKey: value.OPENAI_API_KEY });
  const registry = createProviderRegistry({
    google,
    openai: customProvider({ languageModels: { [value.AI_REASONING_MODEL.modelId]: openai.responses(value.AI_REASONING_MODEL.modelId) }, fallbackProvider: openai }),
  });
  const settings: Parameters<typeof defaultSettingsMiddleware>[0]["settings"] = value.AI_REASONING_MODEL.provider === "openai"
    ? { providerOptions: { openai: { reasoningEffort: "low", reasoningSummary: null, store: false } satisfies OpenAILanguageModelResponsesOptions } }
    : { providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } } };
  const reasoning = wrapLanguageModel({ model: registry.languageModel(value.AI_REASONING_MODEL.registryId), middleware: defaultSettingsMiddleware({ settings }) });
  return { reasoning, embed: createEmbeddingAdapter({ model: registry.embeddingModel(value.AI_EMBEDDING_MODEL.registryId), dimensions: value.AI_EMBEDDING_DIMENSIONS }), embeddingModel: value.AI_EMBEDDING_MODEL.modelId, dimensions: value.AI_EMBEDDING_DIMENSIONS };
}
