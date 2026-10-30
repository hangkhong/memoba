import { z } from "zod";

const localHosts = ["localhost", "127.0.0.1", "[::1]"];
const stackIdSchema = z.string().regex(/^[0-9a-f]{64}$/);
const stackSchema = z.object({
  runtime: z.literal("native"),
  // `start` reports the stack id at the top level; `status` reports it under `identity`.
  id: stackIdSchema.optional(),
  identity: z.object({ id: stackIdSchema }).optional(),
  env: z.object({
    API_URL: z.url({ protocol: /^http$/ }).refine((value) => localHosts.includes(new URL(value).hostname)),
    DB_URL: z.url({ protocol: /^postgresql$/ }).refine((value) => localHosts.includes(new URL(value).hostname)),
    PUBLISHABLE_KEY: z.string().min(1),
    SECRET_KEY: z.string().min(1),
  }),
  endpoints: z.record(z.string(), z.object({ url: z.string().min(1) })),
});

export function parseNativeStack(input: unknown) {
  const parsed = stackSchema.safeParse(input);
  const id = parsed.success ? parsed.data.id ?? parsed.data.identity?.id : undefined;
  if (!parsed.success || !id) throw new Error("Native local Supabase is unavailable or returned an unsupported status. No credentials were displayed.");
  return {
    id,
    url: parsed.data.env.API_URL,
    dbUrl: parsed.data.env.DB_URL,
    publishableKey: parsed.data.env.PUBLISHABLE_KEY,
    secretKey: parsed.data.env.SECRET_KEY,
    endpoints: parsed.data.endpoints,
  };
}

export function findStudioUrl(endpoints: Record<string, { url: string }>) {
  return Object.entries(endpoints).find(([name]) => name.toLowerCase().includes("studio"))?.[1].url;
}

export function formatLocalEndpoints(stack: ReturnType<typeof parseNativeStack>, appUrl: string) {
  return [`App: ${appUrl}`, `Studio: ${findStudioUrl(stack.endpoints) ?? "unavailable"}`, `API: ${stack.url}`].join("\n");
}
