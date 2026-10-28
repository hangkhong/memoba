import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { readAIConfig } from "../config/env";
import { createEmbeddingAdapter } from "./embeddings";

export function configuredModels() {
  const config = readAIConfig(process.env);
  if (config.kind !== "configured") throw new Error("AI_UNAVAILABLE");
  const google = createGoogleGenerativeAI({ apiKey: config.value.GOOGLE_GENERATIVE_AI_API_KEY });
  return { reasoning: google(config.value.AI_REASONING_MODEL), embed: createEmbeddingAdapter({ model: google.embedding(config.value.AI_EMBEDDING_MODEL), dimensions: config.value.AI_EMBEDDING_DIMENSIONS }), embeddingModel: config.value.AI_EMBEDDING_MODEL, dimensions: config.value.AI_EMBEDDING_DIMENSIONS };
}
