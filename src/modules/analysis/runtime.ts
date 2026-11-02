import { createServerSupabase } from "@/lib/supabase/server";
import { configuredModels } from "@/lib/ai/models";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { answerCoverage, createRunKnowledge } from "@/modules/knowledge/service";
import { knowledgeRepository } from "@/modules/knowledge/repository";
import { analysisRepository } from "./repository";
import { textReasoningAdapter } from "./agent";
import { runTextAnalysis } from "./harness";
import type { AnalysisEvent } from "./events";
import type { OnDraft } from "./draft";
import type { StoredRunInput } from "./schema";
import { executionLimits } from "@/lib/contracts/limits";
import { loadHeldEvidence } from "@/modules/conversations/held";
import { citableHeld } from "./held";
export async function prepareAnalysis(context: WorkspaceContext, request: StoredRunInput, requestKey: string, turnId?: string, handlerStartedAt = Date.now(), setupSignal?: AbortSignal) {
  setupSignal?.throwIfAborted();
  const models = configuredModels(); const client = await createServerSupabase();
  setupSignal?.throwIfAborted();
  const store = analysisRepository(client, context);
  // The persisted cutoff includes headroom for admission and clock differences.
  const cutoff = process.env.VERCEL === "1" ? handlerStartedAt + executionLimits.hostedDeadlineMs - 10_000 : undefined;
  const remaining = cutoff === undefined ? executionLimits.deadlineMs : cutoff - Date.now();
  if (remaining <= 0) throw new Error("HOST_DEADLINE");
  const admitted = await store.admit(request, requestKey, turnId, Math.min(executionLimits.deadlineMs, remaining), setupSignal, cutoff === undefined ? undefined : new Date(cutoff).toISOString());
  if (admitted.kind !== "admitted") return admitted;
  return { ...admitted, async execute(onEvent: (event: AnalysisEvent) => void, externalSignal: AbortSignal, onDraft?: OnDraft) {
    const signal = AbortSignal.any([externalSignal, AbortSignal.timeout(Math.max(0, new Date(admitted.deadlineAt).getTime() - Date.now()))]);
    const emit = async (event: AnalysisEvent) => { await store.emit(admitted.runId, event); onEvent(event); };
    const started = Date.now();
    const repository = knowledgeRepository(client, context, models.embed, models.embeddingModel, signal);
    const deadlineAt = new Date(admitted.deadlineAt).getTime();
    const knowledge = createRunKnowledge(repository, admitted.runId);
    // A conversation's held evidence is read from saved answers. If it cannot be read the run goes on without it, and a marker from an earlier answer then fails validation instead of being trusted.
    let heldFailed = false;
    const held = turnId ? await loadHeldEvidence(client, context, turnId, repository).catch(() => { heldFailed = true; return []; }) : [];
    const agent = textReasoningAdapter(models.reasoning, knowledge, emit, undefined, held);
    const result = await runTextAnalysis(admitted.input, { ...agent, held: () => citableHeld(held), draft: onDraft, disclosed: knowledge.disclosed, coverage: () => answerCoverage(knowledge.coverage()), emit, canRead: store.canRead, finish: (...args) => store.finish(admitted.runId, ...args), signal: externalSignal, deadlineAt });
    const candidates = knowledge.disclosed().length;
    process.stdout.write(JSON.stringify({ requestId: admitted.runId, status: result.status, code: result.code, candidates, held: held.length, heldFailed, durationMs: Date.now() - started }) + "\n");
    return result;
  } };
}
