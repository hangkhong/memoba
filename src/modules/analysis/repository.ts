import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { executionLimits } from "@/lib/contracts/limits";
import { requestSchema, type NormalizedRequest } from "./schema";
import { eventSchema, terminalSchema, type AnalysisEvent, type Terminal } from "./events";
import type { ModelUsage } from "./harness";
import type { DraftBrief } from "@/modules/briefs/schema";
import type { EvidenceItem } from "@/modules/knowledge/contracts";
const admissionSchema = z.discriminatedUnion("kind", [z.object({ kind: z.literal("admitted"), runId: z.uuid(), deadlineAt: z.iso.datetime({ offset: true }) }), z.object({ kind: z.literal("duplicate"), runId: z.uuid() }), z.object({ kind: z.literal("quota") }), z.object({ kind: z.literal("conflict") })]);
export const runSchema = z.object({ id: z.uuid(), request: requestSchema, status: z.enum(["running", ...terminalSchema.options]), events: z.array(eventSchema), created_at: z.iso.datetime({ offset: true }), deadline_at: z.iso.datetime({ offset: true }), finished_at: z.iso.datetime({ offset: true }).nullable(), error_code: z.string().nullable(), usage: z.object({ inputTokens: z.number().nullable(), outputTokens: z.number().nullable(), totalTokens: z.number().nullable() }).nullable() });
export function analysisRepository(client: SupabaseClient<Database>, context: WorkspaceContext) {
  return {
    async admit(request: NormalizedRequest, requestKey: string, turnId?: string) {
      const limits = { request_key: requestKey, max_concurrent: executionLimits.concurrentRuns, deadline_ms: executionLimits.deadlineMs };
      const call = turnId ? client.rpc("admit_conversation_analysis", { turn: turnId, ...limits }) : client.rpc("admit_analysis", { w: context.workspaceId, input: request, ...limits });
      const result = await call.abortSignal(AbortSignal.timeout(10000));
      if (result.error?.code === "23505") return admissionSchema.parse({ kind: "conflict" });
      if (result.error) throw new Error("RUN_ADMISSION_FAILED");
      return admissionSchema.parse(result.data);
    },
    async emit(runId: string, event: AnalysisEvent) { const result = await client.rpc("append_analysis_event", { run: runId, event }).abortSignal(AbortSignal.timeout(5000)); if (result.error) throw new Error("EVENT_SAVE_FAILED"); },
    async finish(runId: string, terminal: Terminal, draft: DraftBrief | null, snapshots: EvidenceItem[], code: string | null, usage: ModelUsage | null) {
      const result = await client.rpc("finish_analysis", { run: runId, terminal, draft, snapshots, code: code ?? "", usage }).abortSignal(AbortSignal.timeout(5000));
      if (result.error) throw new Error("RUN_SAVE_FAILED");
      return z.uuid().nullable().parse(result.data);
    },
    async canRead(item: EvidenceItem) {
      const result = await client.from("case_sections").select("id").eq("workspace_id", context.workspaceId).eq("id", item.sectionId).eq("revision_id", item.revisionId).eq("section_key", item.sectionKey).abortSignal(AbortSignal.timeout(5000)).maybeSingle();
      if (result.error) throw new Error("SOURCE_ACCESS_UNAVAILABLE");
      return z.object({ id: z.uuid() }).nullable().parse(result.data) !== null;
    },
  };
}
export async function readRun(client: SupabaseClient<Database>, context: WorkspaceContext, runId: string) {
  const reconciled = await client.rpc("reconcile_analysis", { run: runId }); if (reconciled.error) return null;
  const result = await client.from("analysis_runs").select("*").eq("id", runId).eq("workspace_id", context.workspaceId).maybeSingle();
  if (result.error || !result.data) return null;
  const run = runSchema.parse(result.data);
  const brief = await client.from("briefs").select("id").eq("run_id", run.id).eq("workspace_id", context.workspaceId).maybeSingle();
  if (brief.error) throw new Error("BRIEF_UNAVAILABLE");
  return { ...run, briefId: z.object({ id: z.uuid() }).nullable().parse(brief.data)?.id ?? null };
}

export async function recentRuns(client: SupabaseClient<Database>, context: WorkspaceContext) {
  const result=await client.from("analysis_runs").select("id,status,request,created_at").eq("workspace_id",context.workspaceId).order("created_at",{ascending:false}).limit(10);
  if(result.error)throw new Error("RUNS_UNAVAILABLE");
  return z.array(z.object({id:z.uuid(),status:z.string(),request:requestSchema,created_at:z.string()})).parse(result.data);
}
