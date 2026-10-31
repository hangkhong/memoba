import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { workspaceContextSchema } from "@/lib/auth/schema";
import { executionLimits } from "@/lib/contracts/limits";
import { knowledgeRepository } from "./repository";

it("requests the candidate limit independently of the delivered section limit", async () => {
  const requests: unknown[] = [];
  const client = createClient<Database>("http://localhost:54321", "test-public-key", { global: { fetch: async (_input, init) => {
    if (typeof init?.body !== "string") throw new Error("Expected RPC JSON");
    requests.push(JSON.parse(init.body));
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  } } });
  const context = workspaceContextSchema.parse({ userId: crypto.randomUUID(), workspaceId: crypto.randomUUID(), workspaceName: "Synthetic", knowledgeVersion: 1 });
  const repository = knowledgeRepository(client, context, async () => ({ kind: "success", vectors: [[1]], tokens: 1 }), "text-embedding-3-small", new AbortController().signal);
  expect(await repository.search({ query: "pilot", purpose: "method", conceptIds: [] })).toEqual({ cases: { kind: "empty", items: [] }, documents: { kind: "empty", items: [] } });
  expect(z.object({ max_results: z.number(), per_case: z.number() }).parse(requests[0])).toMatchObject({ max_results: executionLimits.candidateSections, per_case: executionLimits.searchSectionsPerCase });
  expect(z.object({ max_documents: z.number() }).parse(requests[1])).toMatchObject({ max_documents: executionLimits.documentCandidates });
  expect(executionLimits.candidateSections).not.toBe(executionLimits.contextSections);
});

it("fails both sources when the query cannot be embedded and settles them separately otherwise", async () => {
  const context = workspaceContextSchema.parse({ userId: crypto.randomUUID(), workspaceId: crypto.randomUUID(), workspaceName: "Synthetic", knowledgeVersion: 1 });
  const client = (fail: string) => createClient<Database>("http://localhost:54321", "test-public-key", { global: { fetch: async (input) => String(input).includes(fail) ? new Response(JSON.stringify({ code: "XX000", message: "boom" }), { status: 500, headers: { "content-type": "application/json" } }) : new Response("[]", { status: 200, headers: { "content-type": "application/json" } }) } });
  const failedEmbedding = knowledgeRepository(client("none"), context, async () => ({ kind: "error", code: "EMBEDDING_UNAVAILABLE", retryable: true }), "text-embedding-3-small", new AbortController().signal);
  expect(await failedEmbedding.search({ query: "pilot", purpose: "method", conceptIds: [] })).toEqual({ cases: { kind: "error", code: "UNAVAILABLE", retryable: true }, documents: { kind: "error", code: "UNAVAILABLE", retryable: true } });
  const documentsDown = knowledgeRepository(client("search_knowledge_documents"), context, async () => ({ kind: "success", vectors: [[1]], tokens: 1 }), "text-embedding-3-small", new AbortController().signal);
  expect(await documentsDown.search({ query: "pilot", purpose: "method", conceptIds: [] })).toEqual({ cases: { kind: "empty", items: [] }, documents: { kind: "error", code: "QUERY_FAILED", retryable: false } });
});
