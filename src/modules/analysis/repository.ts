import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { executionLimits } from "@/lib/contracts/limits";
import { requestSchema, storedRunInputSchema, textRunInputSchema, type StoredRunInput } from "./schema";
import { eventSchema, terminalSchema, type AnalysisEvent, type Terminal } from "./events";
import type { ModelUsage } from "./harness";
import type { StoredAnswer } from "@/modules/briefs/schema";
import type { EvidenceItem } from "@/modules/knowledge/contracts";
const admissionSchema = z.discriminatedUnion("kind", [z.object({ kind: z.literal("admitted"), runId: z.uuid(), deadlineAt: z.iso.datetime({ offset: true }), input: textRunInputSchema }), z.object({ kind: z.literal("duplicate"), runId: z.uuid() }), z.object({ kind: z.literal("quota") }), z.object({ kind: z.literal("conflict") })]);
export class AdmissionContextOverflow extends Error {}
export const runSchema = z.object({ id: z.uuid(), request: requestSchema, status: z.enum(["running", ...terminalSchema.options]), events: z.array(eventSchema), created_at: z.iso.datetime({ offset: true }), deadline_at: z.iso.datetime({ offset: true }), finished_at: z.iso.datetime({ offset: true }).nullable(), error_code: z.string().nullable(), usage: z.object({ inputTokens: z.number().nullable(), outputTokens: z.number().nullable(), totalTokens: z.number().nullable() }).nullable() });
export const storedRunSchema = runSchema.extend({ request: storedRunInputSchema });
export function analysisRepository(client: SupabaseClient<Database>, context: WorkspaceContext) {
  return {
    async admit(request: StoredRunInput, requestKey: string, turnId?: string, deadlineMs: number = executionLimits.deadlineMs, signal?: AbortSignal, cutoffAt?: string) {
      const limits = { request_key: requestKey, max_concurrent: executionLimits.concurrentRuns, deadline_ms: deadlineMs, ...(cutoffAt ? { cutoff_at: cutoffAt } : {}) };
      const call = turnId ? client.rpc("admit_conversation_analysis", { turn: turnId, ...limits }) : client.rpc("admit_analysis", { w: context.workspaceId, input: request, ...limits });
      const timeout = AbortSignal.timeout(10_000);
      const result = await call.abortSignal(signal ? AbortSignal.any([signal, timeout]) : timeout);
      if (result.error?.code === "23505") return admissionSchema.parse({ kind: "conflict" });
      if (result.error?.code === "22023" && result.error.message === "Conversation context exceeds the limit") throw new AdmissionContextOverflow();
      if (result.error) throw new Error("RUN_ADMISSION_FAILED");
      return admissionSchema.parse(result.data);
    },
    async emit(runId: string, event: AnalysisEvent) { const result = await client.rpc("append_analysis_event", { run: runId, event }).abortSignal(AbortSignal.timeout(5000)); if (result.error) throw new Error("EVENT_SAVE_FAILED"); },
    async finish(runId: string, terminal: Terminal, draft: StoredAnswer | null, snapshots: EvidenceItem[], code: string | null, usage: ModelUsage | null) {
      const result = await client.rpc("finish_analysis", { run: runId, terminal, draft, snapshots, code: code ?? "", usage }).abortSignal(AbortSignal.timeout(5000));
      if (result.error) throw new Error("RUN_SAVE_FAILED");
      return z.uuid().nullable().parse(result.data);
    },
    async canRead(item: EvidenceItem) {
      const result = await client.from("case_sections").select("id").eq("workspace_id", context.workspaceId).eq("id", item.sectionId).eq("revision_id", item.revisionId).eq("section_key", item.sectionKey).abortSignal(AbortSignal.timeout(5000)).maybeSingle();
      if (result.error) throw new Error("SOURCE_ACCESS_UNAVAILABLE");
      return z.object({ id: z.uuid() }).nullable().parse(result.data) !== null;
    },
    // One query for all items; each must match a readable section on id, revision and key, as canRead does.
    async canReadAll(items: EvidenceItem[]) {
      if (items.length === 0) return true;
      const result = await client.from("case_sections").select("id,revision_id,section_key").eq("workspace_id", context.workspaceId).in("id", [...new Set(items.map((item) => item.sectionId))]).abortSignal(AbortSignal.timeout(5000));
      if (result.error) throw new Error("SOURCE_ACCESS_UNAVAILABLE");
      const readable = new Set(z.array(z.object({ id: z.uuid(), revision_id: z.uuid(), section_key: z.string() })).parse(result.data).map((row) => `${row.id}:${row.revision_id}:${row.section_key}`));
      return items.every((item) => readable.has(`${item.sectionId}:${item.revisionId}:${item.sectionKey}`));
    },
  };
}
export async function readStoredRun(client: SupabaseClient<Database>, context: WorkspaceContext, runId: string) {
  const readRun = () => client.from("analysis_runs").select("*").eq("id", runId).eq("workspace_id", context.workspaceId).maybeSingle();
  let result = await readRun();
  if (result.error || !result.data) return null;
  // Only a running run can expire, so a terminal run needs no reconcile round trip.
  if (result.data.status === "running") {
    const reconciled = await client.rpc("reconcile_analysis", { run: runId }); if (reconciled.error) return null;
    result = await readRun();
    if (result.error || !result.data) return null;
  }
  const run = storedRunSchema.parse(result.data);
  const brief = await client.from("briefs").select("id").eq("run_id", run.id).eq("workspace_id", context.workspaceId).maybeSingle();
  if (brief.error) throw new Error("BRIEF_UNAVAILABLE");
  return { ...run, briefId: z.object({ id: z.uuid() }).nullable().parse(brief.data)?.id ?? null };
}

export async function recentRuns(client: SupabaseClient<Database>, context: WorkspaceContext) {
  const result=await client.from("analysis_runs").select("id,status,request,created_at").eq("workspace_id",context.workspaceId).order("created_at",{ascending:false}).limit(10);
  if(result.error)throw new Error("RUNS_UNAVAILABLE");
  return z.array(z.object({id:z.uuid(),status:z.string(),request:storedRunInputSchema,created_at:z.string()})).parse(result.data);
}
