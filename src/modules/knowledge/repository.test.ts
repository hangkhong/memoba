import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { workspaceContextSchema } from "@/lib/auth/schema";
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
  expect(await repository.search({ query: "pilot", purpose: "method", conceptIds: [] })).toEqual({ kind: "empty", items: [] });
  expect(z.object({ max_results: z.number() }).parse(requests[0]).max_results).toBe(40);
});
