import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { readLocalStack } from "./local-stack.ts";

try {
  const local = readLocalStack();
  const existing = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
  const kept = existing.split("\n").filter((line) => !line.startsWith("NEXT_PUBLIC_SUPABASE_URL=") && !line.startsWith("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=") && !line.startsWith("SUPABASE_STACK_ID="));
  writeFileSync(".env.local", [`NEXT_PUBLIC_SUPABASE_URL=${local.url}`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${local.publishableKey}`, `SUPABASE_STACK_ID=${local.id}`, ...kept].join("\n"));
  chmodSync(".env.local", 0o600);
  process.stdout.write(`Updated public Next.js configuration from native stack ${local.id.slice(0, 12)}. Server secrets were not copied.\n`);
} catch { process.stderr.write("Could not configure local Supabase. Start the native stack first.\n"); process.exitCode = 1; }
