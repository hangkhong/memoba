import { z } from "zod";

const httpUrl = z.url({ protocol: /^https?$/ });
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: httpUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
});
const modelReferenceSchema = z.string().trim().regex(/^(?:(?:google|openai):)?[^\s/:]+$/).transform((value) => {
  const separator = value.indexOf(":");
  const provider = value.startsWith("openai:") ? "openai" : "google";
  const modelId = separator < 0 ? value : value.slice(separator + 1);
  return { provider, modelId, registryId: `${provider}:${modelId}` as const };
});
const embeddingSettingsSchema = z.object({
  AI_EMBEDDING_MODEL: modelReferenceSchema,
  AI_EMBEDDING_DIMENSIONS: z.coerce.number().pipe(z.literal(1536)),
}).superRefine((value, context) => {
  const embedding = value.AI_EMBEDDING_MODEL;
  if (!((embedding.provider === "google" && embedding.modelId === "gemini-embedding-2") || (embedding.provider === "openai" && embedding.modelId === "text-embedding-3-small"))) {
    context.addIssue({ code: "custom", path: ["AI_EMBEDDING_MODEL"], message: "Unsupported embedding profile." });
  }
});
const aiSchema = embeddingSettingsSchema.and(z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().trim().optional(),
  OPENAI_API_KEY: z.string().trim().optional(),
  AI_REASONING_MODEL: modelReferenceSchema,
})).superRefine((value, context) => {
  for (const provider of new Set([value.AI_REASONING_MODEL.provider, value.AI_EMBEDDING_MODEL.provider])) {
    const field = provider === "openai" ? "OPENAI_API_KEY" : "GOOGLE_GENERATIVE_AI_API_KEY";
    if (!value[field]) context.addIssue({ code: "custom", path: [field], message: "Selected provider requires a server key." });
  }
});

export type AppConfig = z.infer<typeof publicSchema>;
export type AIConfig = z.infer<typeof aiSchema>;
const environmentSchema = z.object({ NEXT_PUBLIC_SUPABASE_URL: z.unknown().optional(), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.unknown().optional() });

export function readAppConfig(input: unknown) {
  const env = environmentSchema.safeParse(input);
  if (!env.success) return { kind: "invalid", fields: ["environment"] } as const;
  if (!env.data.NEXT_PUBLIC_SUPABASE_URL && !env.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { kind: "unavailable", reason: "Configure local Supabase first." } as const;
  }
  const result = publicSchema.safeParse(env.data);
  return result.success
    ? { kind: "configured", value: result.data } as const
    : { kind: "invalid", fields: result.error.issues.map((issue) => issue.path.join(".")) } as const;
}

export function readAIConfig(input: unknown) {
  const result = aiSchema.safeParse(input);
  return result.success
    ? { kind: "configured", value: result.data } as const
    : { kind: "unavailable", fields: result.error.issues.map((issue) => issue.path.join(".")) } as const;
}

export function readEmbeddingProfile(input: unknown) {
  const environment = z.object({ AI_EMBEDDING_MODEL: z.unknown().optional(), AI_EMBEDDING_DIMENSIONS: z.unknown().optional() }).safeParse(input);
  if (!environment.success) return { kind: "invalid" } as const;
  if (environment.data.AI_EMBEDDING_MODEL === undefined && environment.data.AI_EMBEDDING_DIMENSIONS === undefined) return { kind: "unavailable" } as const;
  const result = embeddingSettingsSchema.safeParse(input);
  return result.success
    ? { kind: "configured", value: { embeddingModel: result.data.AI_EMBEDDING_MODEL.modelId, dimensions: result.data.AI_EMBEDDING_DIMENSIONS } } as const
    : { kind: "invalid" } as const;
}
