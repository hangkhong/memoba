import { executionLimits } from "@/lib/contracts/limits";
import { buildEvidenceBundle, type EvidenceRegistry } from "@/modules/knowledge/context";
import type { EvidenceBundle, EvidenceItem, ToolResult } from "@/modules/knowledge/contracts";
import type { KnowledgeStore } from "@/modules/knowledge/service";
import { validateBrief } from "@/modules/briefs/validation";
import type { DraftBrief } from "@/modules/briefs/schema";
import { createRunBudget, BudgetError } from "./budget";
import { buildRequestPlan } from "./planner";
import type { NormalizedRequest } from "./schema";
import type { AnalysisEvent, Terminal } from "./events";
export type RunBudget = ReturnType<typeof createRunBudget>;
export type ModelUsage = { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
export type GenerateArgs = { request: NormalizedRequest; bundle: EvidenceBundle; budget: RunBudget };
type Dependencies = {
  registry: EvidenceRegistry; knowledge: KnowledgeStore;
  generate: (args: GenerateArgs) => Promise<{ draft: unknown; usage: ModelUsage }>;
  repair: (args: GenerateArgs & { draft: unknown; code: string }) => Promise<{ draft: unknown; usage: ModelUsage }>;
  canRead: (item: EvidenceItem) => Promise<boolean>;
  emit: (event: AnalysisEvent) => Promise<void>;
  finish: (status: Terminal, draft: DraftBrief | null, items: EvidenceItem[], code: string | null, usage: ModelUsage | null) => Promise<string | null>;
  signal?: AbortSignal; deadlineAt?: number;
};
export async function runAnalysis(request: NormalizedRequest, deps: Dependencies) {
  const budget = createRunBudget(deps.signal, deps.deadlineAt);
  const event = (stage: AnalysisEvent["stage"], state: AnalysisEvent["state"], count?: number) => budget.run(() => deps.emit({ stage, state, at: new Date().toISOString(), ...(count === undefined ? {} : { count }) }));
  let usage: ModelUsage | null = null;
  try {
    await event("intake", "completed"); await event("planning", "started");
    const plan = buildRequestPlan(request);
    await event("planning", "completed", plan.queries.length); await event("retrieval", "started");
    for (const query of plan.queries) {
      let result: ToolResult = await budget.run(() => deps.knowledge.search({ ...query, conceptIds: request.conceptIds }));
      for (let retry = 0; result.kind === "error" && result.retryable && retry < executionLimits.transientRetries; retry++) result = await budget.run(() => deps.knowledge.search({ ...query, conceptIds: request.conceptIds }));
      if (result.kind === "error") throw new Error(result.code);
    }
    if (deps.registry.items().length) {
      const seeds = [...new Set(deps.registry.items().map((item) => item.caseId))];
      const expansion = await budget.run(() => deps.knowledge.expand({ seedIds: seeds, relationTypes: ["related_to", "contrasts_with", "supersedes"] }));
      if (expansion.kind === "error") throw new Error(expansion.code);
    }
    await event("retrieval", "completed", deps.registry.items().length);
    await event("context", "started"); const bundle = buildEvidenceBundle({ items: deps.registry.items() }); await event("context", "completed", bundle.items.length);
    if (!bundle.items.length) {
      await budget.run(() => deps.finish("gap_report", null, [], null, null));
      return { status: "gap_report", briefId: null, code: null } as const;
    }
    await event("reasoning", "started");
    let output = await budget.run(() => deps.generate({ request, bundle, budget })); usage = output.usage;
    await event("reasoning", "completed"); await event("validation", "started");
    let checked = await budget.run(() => validateBrief({ draft: output.draft, evidenceRegistry: deps.registry, canRead: deps.canRead }));
    if (checked.kind === "invalid") {
      const validationCode = checked.code; budget.consume("repair"); output = await budget.run(() => deps.repair({ request, bundle, budget, draft: output.draft, code: validationCode }));
      usage = { inputTokens: usage.inputTokens === null || output.usage.inputTokens === null ? null : usage.inputTokens + output.usage.inputTokens, outputTokens: usage.outputTokens === null || output.usage.outputTokens === null ? null : usage.outputTokens + output.usage.outputTokens, totalTokens: usage.totalTokens === null || output.usage.totalTokens === null ? null : usage.totalTokens + output.usage.totalTokens };
      checked = await budget.run(() => validateBrief({ draft: output.draft, evidenceRegistry: deps.registry, canRead: deps.canRead }));
    }
    if (checked.kind === "invalid") throw new Error(checked.code);
    await event("validation", "completed");
    const briefId = await budget.run(() => deps.finish("complete", checked.value, deps.registry.items(), null, usage));
    if (!briefId) return { status: "timed_out", briefId: null, code: "TIMED_OUT" } as const;
    return { status: "complete", briefId, code: null } as const;
  } catch (error) {
    const status = error instanceof BudgetError ? error.code === "TIMED_OUT" ? "timed_out" : error.code === "CANCELLED" ? "cancelled" : "failed" : "failed";
    const allowedCodes = ["QUERY_FAILED", "UNAVAILABLE", "INVALID_RESULT", "INVALID_SCHEMA", "INVALID_CITATION", "SOURCE_ACCESS_DENIED", "SOURCE_ACCESS_UNAVAILABLE", "REPAIR_EXHAUSTED", "MODEL_RATE_LIMITED", "MODEL_UNAVAILABLE", "MODEL_FAILED"];
    const code = error instanceof BudgetError ? error.code : error instanceof Error && allowedCodes.includes(error.message) ? error.message : "ANALYSIS_FAILED";
    // Cleanup uses its own bounded store call because the run signal may already be aborted.
    await deps.finish(status, null, [], code, usage);
    return { status, briefId: null, code };
  } finally { budget.dispose(); }
}
