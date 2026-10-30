import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { executionLimits } from "@/lib/contracts/limits";
import { evidenceSchema, type ToolResult } from "./contracts";
import type { KnowledgeStore } from "./service";

type Embed = (args: { texts: string[]; signal: AbortSignal }) => Promise<{ kind: "success"; vectors: number[][]; tokens: number | null } | { kind: "error"; code: string; retryable: boolean }>;
export function knowledgeRepository(client: SupabaseClient<Database>, context: WorkspaceContext, embed: Embed, model: string, signal: AbortSignal): KnowledgeStore {
  function parse(result: { data: unknown; error: { code?: string } | null }): ToolResult {
    if (result.error) return { kind: "error", code: result.error.code === "42501" ? "ACCESS_DENIED" : "QUERY_FAILED", retryable: ["57014", "PGRST000", "PGRST001"].includes(result.error.code ?? "") };
    const parsed = z.array(evidenceSchema).safeParse(result.data);
    if (!parsed.success) return { kind: "error", code: "INVALID_RESULT", retryable: false };
    return parsed.data.length ? { kind: "success", items: parsed.data } : { kind: "empty", items: [] };
  }
  return {
    async search(input) {
      const embedding = await embed({ texts: [input.query], signal });
      if (embedding.kind === "error") return { kind: "error", code: "UNAVAILABLE", retryable: embedding.retryable };
      const vector = embedding.vectors[0]; if (!vector) return { kind: "error", code: "INVALID_RESULT", retryable: false };
      return parse(await client.rpc("search_knowledge", { w: context.workspaceId, query_text: input.query, query_embedding: JSON.stringify(vector), purpose: input.purpose, concept_ids: input.conceptIds, max_results: executionLimits.candidateSections, model, per_case: executionLimits.searchSectionsPerCase }).abortSignal(signal));
    },
    async read(input) {
      let revision = input.revisionId;
      if (!revision) {
        const result = await client.from("cases").select("published_revision_id").eq("workspace_id", context.workspaceId).eq("id", input.caseId).eq("lifecycle", "active").abortSignal(signal).maybeSingle();
        if (result.error) return { kind: "error", code: "QUERY_FAILED", retryable: false };
        const parsed = z.object({ published_revision_id: z.uuid().nullable() }).nullable().safeParse(result.data);
        if (!parsed.success) return { kind: "error", code: "INVALID_RESULT", retryable: false };
        revision = parsed.data?.published_revision_id ?? undefined;
        if (!revision) return { kind: "empty", items: [] };
      }
      return parse(await client.rpc("read_knowledge_case", { w: context.workspaceId, target: input.caseId, revision, keys: input.sectionKeys, max_results: executionLimits.candidateSections }).abortSignal(signal));
    },
    async template(revisionId) {
      const result = await client.from("case_revisions").select("template:content->>template").eq("workspace_id", context.workspaceId).eq("id", revisionId).abortSignal(signal).maybeSingle();
      const parsed = z.object({ template: z.enum(["product_delivery", "cs_operations"]) }).safeParse(result.data);
      return parsed.success ? parsed.data.template : undefined;
    },
    async expand(input) { return parse(await client.rpc("expand_knowledge", { w: context.workspaceId, seeds: input.seedIds, relations: input.relationTypes, max_results: executionLimits.candidateSections }).abortSignal(signal)); },
  };
}
