import { z } from "zod";
import { readLocalStack } from "./local-stack.ts";

export type SeedTarget = { url: string; secretKey: string; kind: "local" | "remote" };

export function resolveTarget(argv: string[], env: unknown): SeedTarget {
  if (!argv.includes("--remote")) {
    const local = readLocalStack();
    return { url: local.url, secretKey: local.secretKey, kind: "local" };
  }
  const source = z.object({ SUPABASE_URL: z.unknown(), SUPABASE_SECRET_KEY: z.unknown() }).parse(env ?? {});
  const url = z.url({ protocol: /^https$/ }).safeParse(source.SUPABASE_URL);
  if (!url.success) throw new Error("Set SUPABASE_URL to the https project URL for --remote.");
  const key = z.string().min(1).safeParse(source.SUPABASE_SECRET_KEY);
  if (!key.success) throw new Error("Set SUPABASE_SECRET_KEY for --remote.");
  return { url: url.data, secretKey: key.data, kind: "remote" };
}
