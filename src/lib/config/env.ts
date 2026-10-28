import { z } from "zod";

const httpUrl = z.url({ protocol: /^https?$/ });
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: httpUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
});
const aiSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().trim().min(1),
  AI_REASONING_MODEL: z.string().trim().regex(/^[^\s/]+$/),
  AI_EMBEDDING_MODEL: z.string().trim().regex(/^[^\s/]+$/),
  AI_EMBEDDING_DIMENSIONS: z.coerce.number().int().min(1).max(16000),
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
