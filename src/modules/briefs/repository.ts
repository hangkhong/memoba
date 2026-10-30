import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { draftBriefSchema, storedAnswerSchema } from "./schema";
import { evidenceSchema } from "@/modules/knowledge/contracts";
import { analysisRepository } from "@/modules/analysis/repository";
export const briefRecordSchema = z.object({ id: z.uuid(), run_id: z.uuid(), generated: draftBriefSchema, evidence: z.array(evidenceSchema), hard_constraints: z.array(z.object({ kind: z.enum(["requirement", "prohibition"]), text: z.string() })), edited_text: z.string().nullable(), edited_at: z.iso.datetime({ offset: true }).nullable(), saved: z.boolean(), created_at: z.iso.datetime({ offset: true }) });
export type SavedBrief = z.infer<typeof briefRecordSchema>;
export const storedBriefRecordSchema = briefRecordSchema.extend({ generated: storedAnswerSchema });
export type StoredBrief = z.infer<typeof storedBriefRecordSchema>;
export async function readStoredBrief(client: SupabaseClient<Database>, context: WorkspaceContext, id: string) {
  const result = await client.from("briefs").select("*").eq("workspace_id", context.workspaceId).eq("id", id).maybeSingle();
  if (result.error || !result.data) return null;
  const brief = storedBriefRecordSchema.parse(result.data);
  const repository = analysisRepository(client, context);
  if (!await repository.canReadAll(brief.evidence)) return null;
  return brief;
}
export const briefEditSchema = z.object({ text: z.string().max(20000), saved: z.boolean() }).strict();
