import { validateTextAnswer } from "@/modules/briefs/validation";
import type { AnswerCoverage, TextAnswer } from "@/modules/briefs/schema";
import type { DisclosedSource, EvidenceItem } from "@/modules/knowledge/contracts";
import { createRunBudget, BudgetError } from "./budget";
import type { TextRunInput } from "./schema";
import type { EvaluationTrace } from "./evaluation-trace";
import type { AnalysisEvent, Terminal } from "./events";
export type RunBudget = ReturnType<typeof createRunBudget>;
export type ModelUsage = { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };

type TextDependencies = {
  generate: (request: TextRunInput, budget: RunBudget) => Promise<{ text: string; usage: ModelUsage }>;
  repair: (request: TextRunInput, draft: string, code: string, budget: RunBudget) => Promise<{ text: string; usage: ModelUsage }>;
  disclosed: () => DisclosedSource[];
  coverage?: () => AnswerCoverage;
  canRead: (item: EvidenceItem) => Promise<boolean>;
  emit: (event: AnalysisEvent) => Promise<void>;
  finish: (status: Terminal, answer: TextAnswer | null, items: EvidenceItem[], code: string | null, usage: ModelUsage | null) => Promise<string | null>;
  signal?: AbortSignal; deadlineAt?: number;
  trace?: EvaluationTrace;
};

export async function runTextAnalysis(request: TextRunInput, deps: TextDependencies) {
  const budget = createRunBudget(deps.signal, deps.deadlineAt);
  const event = (stage: AnalysisEvent["stage"], state: AnalysisEvent["state"]) => budget.run(() => deps.emit({ stage, state, at: new Date().toISOString() }));
  let usage: ModelUsage | null = null;
  try {
    await event("intake", "completed");
    await event("reasoning", "started");
    let output = await budget.run(() => deps.generate(request, budget));
    usage = output.usage;
    await event("reasoning", "completed");
    await event("validation", "started");
    let checked = await budget.run(() => validateTextAnswer({ text: output.text, disclosed: deps.disclosed(), canRead: deps.canRead }));
    deps.trace?.({ kind: "validation", result: checked.kind, code: checked.kind === "invalid" ? checked.code : null });
    if (checked.kind === "invalid" && (checked.code === "INVALID_CITATION" || checked.code === "INVALID_SCHEMA")) {
      const validationCode = checked.code;
      deps.trace?.({ kind: "correction", state: "started" });
      output = await budget.run(() => deps.repair(request, output.text, validationCode, budget));
      deps.trace?.({ kind: "correction", state: "completed" });
      usage = { inputTokens: usage.inputTokens === null || output.usage.inputTokens === null ? null : usage.inputTokens + output.usage.inputTokens, outputTokens: usage.outputTokens === null || output.usage.outputTokens === null ? null : usage.outputTokens + output.usage.outputTokens, totalTokens: usage.totalTokens === null || output.usage.totalTokens === null ? null : usage.totalTokens + output.usage.totalTokens };
      checked = await budget.run(() => validateTextAnswer({ text: output.text, disclosed: deps.disclosed(), canRead: deps.canRead }));
      deps.trace?.({ kind: "validation", result: checked.kind, code: checked.kind === "invalid" ? checked.code : null });
    }
    if (checked.kind === "invalid") throw new Error(checked.code);
    await event("validation", "completed");
    const briefId = await budget.run(() => deps.finish("complete", deps.coverage ? { ...checked.value, coverage: deps.coverage() } : checked.value, checked.snapshots, null, usage));
    if (!briefId) return { status: "timed_out", briefId: null, code: "TIMED_OUT" } as const;
    return { status: "complete", briefId, code: null } as const;
  } catch (error) {
    const status = error instanceof BudgetError ? error.code === "TIMED_OUT" ? "timed_out" : error.code === "CANCELLED" ? "cancelled" : "failed" : "failed";
    const allowedCodes = ["INVALID_SCHEMA", "INVALID_CITATION", "SOURCE_ACCESS_DENIED", "SOURCE_ACCESS_UNAVAILABLE", "MODEL_RATE_LIMITED", "MODEL_UNAVAILABLE", "MODEL_FAILED"];
    const code = error instanceof BudgetError ? error.code : error instanceof Error && allowedCodes.includes(error.message) ? error.message : "ANALYSIS_FAILED";
    await deps.finish(status, null, [], code, usage);
    return { status, briefId: null, code };
  } finally { budget.dispose(); }
}
