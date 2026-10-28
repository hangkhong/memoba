import { createServerSupabase } from "@/lib/supabase/server";
import { configuredModels } from "@/lib/ai/models";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { createEvidenceRegistry } from "@/modules/knowledge/context";
import { createKnowledgeService } from "@/modules/knowledge/service";
import { knowledgeRepository } from "@/modules/knowledge/repository";
import { analysisRepository } from "./repository";
import { reasoningAdapter } from "./agent";
import { runAnalysis } from "./harness";
import type { AnalysisEvent } from "./events";
import type { NormalizedRequest } from "./schema";
export async function prepareAnalysis(context: WorkspaceContext, request: NormalizedRequest, requestKey: string) {
  const models = configuredModels(); const client = await createServerSupabase();
  const store = analysisRepository(client, context); const admitted = await store.admit(request, requestKey);
  if (admitted.kind !== "admitted") return admitted;
  return { ...admitted, async execute(onEvent: (event: AnalysisEvent) => void, externalSignal: AbortSignal) {
    const signal = AbortSignal.any([externalSignal, AbortSignal.timeout(Math.max(0, new Date(admitted.deadlineAt).getTime() - Date.now()))]);
    const registry = createEvidenceRegistry();
    const knowledge = createKnowledgeService(knowledgeRepository(client, context, models.embed, models.embeddingModel, signal), registry);
    const emit = async (event: AnalysisEvent) => { await store.emit(admitted.runId, event); onEvent(event); };
    const agent = reasoningAdapter(models.reasoning, knowledge, emit);
    const started = Date.now();
    const result = await runAnalysis(request, { registry, knowledge, ...agent, emit, canRead: store.canRead, finish: (...args) => store.finish(admitted.runId, ...args), signal: externalSignal, deadlineAt: new Date(admitted.deadlineAt).getTime() });
    process.stdout.write(JSON.stringify({ requestId: admitted.runId, status: result.status, code: result.code, candidates: registry.items().length, durationMs: Date.now() - started }) + "\n");
    return result;
  } };
}
