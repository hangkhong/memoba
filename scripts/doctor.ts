import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { readAIConfig, readAppConfig } from "../src/lib/config/env.ts";

const cli = "./node_modules/.bin/supabase";
function command(args: string[]) {
  try { return execFileSync(cli, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15000 }); }
  catch { return undefined; }
}
const config = readAppConfig(process.env);
const ai = readAIConfig(process.env);
const cliVersion = command(["--version"])?.trim();
const statusOutput = command(["status", "--output-format", "json"]);
const statusSchema = z.object({ runtime: z.literal("native"), readiness: z.string(), services: z.array(z.object({ service: z.string(), state: z.string() })) });
let rawStatus: unknown;
try { rawStatus = statusOutput ? JSON.parse(statusOutput) : null; } catch { rawStatus = null; }
const status = statusSchema.safeParse(rawStatus);
const toml = readFileSync("supabase/config.toml", "utf8");
process.stdout.write(JSON.stringify({
  node: process.versions.node,
  nativePlatformSupported: process.platform === "linux" || (process.platform === "darwin" && process.arch === "arm64"),
  cliVersion: cliVersion ?? "unavailable",
  cliVersionMatches: cliVersion === "2.122.0",
  experimentalStack: /\[experimental\][\s\S]*?stack\s*=\s*true/.test(toml),
  nativeStack: status.success ? { readiness: status.data.readiness, services: status.data.services } : "unavailable",
  app: config.kind,
  ai: ai.kind,
  models: ai.kind === "configured" ? { reasoning: ai.value.AI_REASONING_MODEL.registryId, embedding: ai.value.AI_EMBEDDING_MODEL.registryId, dimensions: ai.value.AI_EMBEDDING_DIMENSIONS } : undefined,
}, null, 2) + "\n");
if (config.kind === "invalid" || cliVersion !== "2.122.0") process.exitCode = 1;
