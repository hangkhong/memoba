import { expect, it } from "vitest";
import { MockEmbeddingModelV4 } from "ai/test";
import { createEmbeddingAdapter } from "./embeddings";

it("uses AI SDK batching and preserves input order with validated dimensions", async () => {
  const model = new MockEmbeddingModelV4({ maxEmbeddingsPerCall: 1, supportsParallelCalls: false, doEmbed: async ({ values }) => ({ embeddings: values.map((value) => value === "First" ? [1, 0] : [0, 1]), usage: { tokens: 3 }, warnings: [] }) });
  const adapter = createEmbeddingAdapter({ model, dimensions: 2 });
  const result = await adapter({ texts: ["First", "Second"], signal: new AbortController().signal });
  expect(result).toMatchObject({ kind: "success", vectors: [[1, 0], [0, 1]], tokens: 6 });
});
it("rejects wrong dimensions and propagates provider failure without fake vectors", async () => {
  const signal = new AbortController().signal;
  const wrong = new MockEmbeddingModelV4({ doEmbed: async () => ({ embeddings: [[1, 0, 0]], usage: { tokens: 1 }, warnings: [] }) });
  expect((await createEmbeddingAdapter({ model: wrong, dimensions: 2 })({ texts: ["Text"], signal })).kind).toBe("error");
  const unavailable = new MockEmbeddingModelV4({ doEmbed: async () => { throw new Error("secret provider error"); } });
  const result = await createEmbeddingAdapter({ model: unavailable, dimensions: 2 })({ texts: ["Text"], signal });
  expect(result).toMatchObject({ kind: "error", code: "EMBEDDING_UNAVAILABLE" });
  expect(JSON.stringify(result)).not.toContain("secret provider error");
});

it("preserves valid vectors when the provider does not report token usage", async () => {
  const model = new MockEmbeddingModelV4({ doEmbed: async () => ({ embeddings: [[1, 0]], warnings: [] }) });
  const result = await createEmbeddingAdapter({ model, dimensions: 2 })({ texts: ["Text"], signal: new AbortController().signal });
  expect(result).toMatchObject({ kind: "success", vectors: [[1, 0]], tokens: null });
});
