import { APICallError, embedMany, type EmbeddingModel } from "ai";
import { z } from "zod";

// SDK types stop in this adapter. Domain consumers receive plain vectors and codes.
export function createEmbeddingAdapter({ model, dimensions }: { model: EmbeddingModel; dimensions: number }) {
  return async ({ texts, signal }: { texts: string[]; signal: AbortSignal }) => {
    try {
      const result = await embedMany({ model, values: texts, dimensions, abortSignal: signal, maxRetries: 0, maxParallelCalls: 1 });
      const parsed = z.object({
        embeddings: z.array(z.array(z.number().finite()).length(dimensions)).length(texts.length),
        usage: z.object({ tokens: z.number().int().nonnegative() }),
      }).safeParse(result);
      if (!parsed.success) return { kind: "error", code: "INVALID_EMBEDDINGS", retryable: false } as const;
      return { kind: "success", vectors: parsed.data.embeddings, tokens: parsed.data.usage.tokens } as const;
    } catch (error) {
      return { kind: "error", code: signal.aborted ? "CANCELLED" : "EMBEDDING_UNAVAILABLE", retryable: !signal.aborted && APICallError.isInstance(error) && error.isRetryable } as const;
    }
  };
}
