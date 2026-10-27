import { createGateway } from "ai";
import { mkdirSync, writeFileSync } from "node:fs";
import { readAIConfig } from "../src/lib/config/env.ts";
import { createEmbeddingAdapter } from "../src/lib/ai/embeddings.ts";

const config = readAIConfig(process.env);
if (config.kind === "unavailable") {
  process.stdout.write("AI unavailable. Set the server-only AI values in .env.local before probing or creating the vector migration.\n");
  process.exitCode = 2;
} else {
  const gateway = createGateway({ apiKey: config.value.AI_GATEWAY_API_KEY });
  const embed = createEmbeddingAdapter({ model: gateway.embeddingModel(config.value.AI_EMBEDDING_MODEL), dimensions: config.value.AI_EMBEDDING_DIMENSIONS });
  const result = await embed({ texts: ["A controlled release with a rollback plan.", "Triển khai có kiểm soát với phương án quay lui."], signal: AbortSignal.timeout(30000) });
  if (result.kind === "error") { process.stdout.write(JSON.stringify({ kind: result.kind, code: result.code }) + "\n"); process.exitCode = 1; }
  else {
    const report = { model: config.value.AI_EMBEDDING_MODEL, dimensions: config.value.AI_EMBEDDING_DIMENSIONS, vectors: result.vectors.length, tokens: result.tokens, verifiedAt: new Date().toISOString() };
    mkdirSync(".superpowers/probes", { recursive: true });
    writeFileSync(".superpowers/probes/embedding.json", JSON.stringify(report, null, 2) + "\n");
    process.stdout.write(JSON.stringify(report, null, 2) + "\nEmbedding capability verified. Reasoning/tool capability still needs the live harness check.\n");
  }
}
