import { generateText, tool } from "ai";
import { z } from "zod";
import { mkdirSync, writeFileSync } from "node:fs";
import { readAIConfig } from "../src/lib/config/env.ts";
import { configuredModels } from "../src/lib/ai/models.ts";
import { executionLimits } from "../src/lib/contracts/limits.ts";

async function probe() {
  const config = readAIConfig(process.env);
  if (config.kind !== "configured") { process.stdout.write("AI unavailable. Set server-only provider credentials and model references in .env.local.\n"); process.exitCode = 2; return; }
  const models = configuredModels();
  if (process.argv.includes("--tool")) {
    let executed = false;
    const result = await generateText({
      model: models.reasoning,
      prompt: "Call the check_runtime tool with value ready. Do not call any other tool.",
      tools: { check_runtime: tool({ description: "Check the synthetic runtime probe.", inputSchema: z.object({ value: z.literal("ready") }), execute: async () => { executed = true; return { ready: true }; } }) },
      toolChoice: { type: "tool", toolName: "check_runtime" },
      maxOutputTokens: executionLimits.outputTokens,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(30000),
    });
    if (!executed) throw new Error("TOOL_NOT_EXECUTED");
    process.stdout.write(JSON.stringify({ kind: "success", capability: "tool", model: config.value.AI_REASONING_MODEL.registryId, toolCalls: result.toolCalls.length, usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, totalTokens: result.usage.totalTokens } }) + "\n");
    return;
  }
  const result = await models.embed({ texts: ["A controlled release with a rollback plan.", "Triển khai có kiểm soát với phương án quay lui."], signal: AbortSignal.timeout(30000) });
  if (result.kind === "error") { process.stdout.write(JSON.stringify({ kind: result.kind, code: result.code }) + "\n"); process.exitCode = 1; return; }
  const report = { model: models.embeddingModel, dimensions: models.dimensions, vectors: result.vectors.length, tokens: result.tokens, verifiedAt: new Date().toISOString() };
  mkdirSync(".artifacts/probes", { recursive: true });
  writeFileSync(".artifacts/probes/embedding.json", JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(JSON.stringify(report, null, 2) + "\nEmbedding capability verified. Use one real analysis to verify reasoning and the app flow.\n");
}
probe().catch(() => { process.stderr.write("AI_CAPABILITY_PROBE_FAILED\n"); process.exitCode = 1; });
