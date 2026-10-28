import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { caseInputSchema, type CaseInput } from "./schema";
import type { CaseStore } from "./service";

import { savedCaseSchema } from "./contracts";
export const revisionSchema = z.object({ id: z.uuid(), case_id: z.uuid(), content: caseInputSchema, index_state: z.enum(["pending", "ready", "failed"]), created_at: z.iso.datetime({ offset: true }) });
export const caseRecordSchema = z.object({ id: z.uuid(), lifecycle: z.enum(["active", "archived"]), published_revision_id: z.uuid().nullable(), latest_revision_id: z.uuid().nullable(), created_at: z.iso.datetime({ offset: true }) });
export type CaseRecord = z.infer<typeof caseRecordSchema>;
export type CaseRevision = z.infer<typeof revisionSchema>;
export function caseRepository(client: SupabaseClient<Database>, context: WorkspaceContext, config: { embeddingModel: string; dimensions: number }, targetCase?: string): CaseStore {
  return {
    async save(input: CaseInput) {
      const result = await client.rpc("save_case_revision", { w: context.workspaceId, input, target_case: targetCase });
      if (result.error) throw new Error("CASE_SAVE_FAILED");
      return savedCaseSchema.parse(result.data);
    },
    async revision(id) {
      const result = await client.from("case_revisions").select("id,case_id,content,index_state,created_at").eq("id", id).eq("workspace_id", context.workspaceId).single();
      if (result.error) throw new Error("CASE_UNAVAILABLE");
      const revision = revisionSchema.parse(result.data);
      return { caseId: revision.case_id, revisionId: revision.id, input: revision.content, indexState: revision.index_state };
    },
    async index(id, sections) {
      const result = await client.rpc("publish_case_revision", { r: id, sections, model: config.embeddingModel, dimensions: config.dimensions });
      if (result.error) throw new Error("INDEX_PUBLISH_FAILED");
      return savedCaseSchema.parse(result.data);
    },
    async fail(id) { const result = await client.rpc("fail_case_index", { r: id }); if (result.error) throw new Error("INDEX_STATUS_FAILED"); },
  };
}
export async function listCases(client: SupabaseClient<Database>, context: WorkspaceContext) {
  const cases = await client.from("cases").select("*").eq("workspace_id", context.workspaceId).order("created_at", { ascending: false });
  if (cases.error) throw new Error("CASE_LIST_FAILED");
  const records = z.array(caseRecordSchema).parse(cases.data);
  const revisions = await client.from("case_revisions").select("id,case_id,content,index_state,created_at").eq("workspace_id", context.workspaceId).in("id", records.flatMap((record) => record.latest_revision_id ? [record.latest_revision_id] : []));
  if (revisions.error) throw new Error("CASE_LIST_FAILED");
  const parsed = z.array(revisionSchema).parse(revisions.data);
  return records.map((record) => ({ ...record, revision: parsed.find((revision) => revision.id === record.latest_revision_id) }));
}
export async function caseDetail(client: SupabaseClient<Database>, context: WorkspaceContext, id: string) {
  const result = await client.from("cases").select("*").eq("workspace_id", context.workspaceId).eq("id", id).maybeSingle();
  if (result.error || !result.data) return null;
  const record = caseRecordSchema.parse(result.data);
  const revisions = await client.from("case_revisions").select("id,case_id,content,index_state,created_at").eq("case_id", id).eq("workspace_id", context.workspaceId).order("created_at", { ascending: false });
  if (revisions.error) throw new Error("CASE_DETAIL_FAILED");
  const links = await client.from("case_links").select("source_id,target_id,relation_type,reason").eq("workspace_id", context.workspaceId).or(`source_id.eq.${id},target_id.eq.${id}`);
  if (links.error) throw new Error("CASE_LINKS_FAILED");
  return { ...record, revisions: z.array(revisionSchema).parse(revisions.data), links: z.array(z.object({ source_id: z.uuid(), target_id: z.uuid(), relation_type: z.string(), reason: z.string() })).parse(links.data) };
}
