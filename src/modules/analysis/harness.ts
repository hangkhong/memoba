import { validateTextAnswer } from "@/modules/briefs/validation";
import type { AnswerCoverage, TextAnswer } from "@/modules/briefs/schema";
import type { DisclosedSource, EvidenceItem } from "@/modules/knowledge/contracts";
import { createRunBudget, BudgetError } from "./budget";
import type { TextRunInput } from "./schema";
import type { EvaluationTrace } from "./evaluation-trace";
import type { AnalysisEvent, Terminal } from "./events";
import type { OnDraft } from "./draft";
export type RunBudget = ReturnType<typeof createRunBudget>;
export type ModelUsage = { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };

type TextDependencies = {
  generate: (request: TextRunInput, budget: RunBudget, onDraft?: OnDraft) => Promise<{ text: string; usage: ModelUsage }>;
  repair: (request: TextRunInput, draft: string, code: string, budget: RunBudget, onDraft?: OnDraft) => Promise<{ text: string; usage: ModelUsage }>;
  disclosed: () => DisclosedSource[];
  // Sources earlier answers in the conversation cited and that may still be cited.
  held?: () => DisclosedSource[];
  coverage?: () => AnswerCoverage;
  canRead: (item: EvidenceItem) => Promise<boolean>;
  emit: (event: AnalysisEvent) => Promise<void>;
  finish: (status: Terminal, answer: TextAnswer | null, items: EvidenceItem[], code: string | null, usage: ModelUsage | null) => Promise<string | null>;
  draft?: OnDraft;
  signal?: AbortSignal; deadlineAt?: number;
  trace?: EvaluationTrace;
};

const marked = /\[S(?::|\d)/;
export async function runTextAnalysis(request: TextRunInput, deps: TextDependencies) {
  const budget = createRunBudget(deps.signal, deps.deadlineAt);
  const event = (stage: AnalysisEvent["stage"], state: AnalysisEvent["state"]) => budget.run(() => deps.emit({ stage, state, at: new Date().toISOString() }));
  let usage: ModelUsage | null = null;
  const held = () => deps.held?.() ?? [];
  const validate = (text: string) => budget.run(() => validateTextAnswer({ text, disclosed: deps.disclosed(), held: held(), canRead: deps.canRead }));
  try {
    await event("intake", "completed");
    await event("reasoning", "started");
    // Some models wrap citations in private-use characters that no font draws; they carry no meaning, so they never reach a saved answer.
    // Some also swap the brackets for look-alikes such as 【】; the marker inside is the same marker.
    const clean = (value: { text: string; usage: ModelUsage }) => ({ ...value, text: value.text.replace(/[\uE000-\uF8FF]/g, "").replace(/[【［]\s*(S:[^\]】］\n]*?)\s*[】］]/g, "[$1]") });
    let output = clean(await budget.run(() => deps.generate(request, budget, deps.draft)));
    usage = output.usage;
    await event("reasoning", "completed");
    await event("validation", "started");
    let checked = await validate(output.text);
    deps.trace?.({ kind: "validation", result: checked.kind, code: checked.kind === "invalid" ? checked.code : null, sectionTags: output.text.match(/\{#(?:process|cases)\}/g)?.length ?? 0 });
    // With no source to correct against, a repair can only invent or refuse, so the run fails with the validation code.
    if (checked.kind === "invalid" && (checked.code === "INVALID_CITATION" || checked.code === "INVALID_SCHEMA" || checked.code === "MISPLACED_CITATION") && deps.disclosed().length + held().length > 0) {
      const validationCode = checked.code;
      const cited = marked.test(output.text);
      deps.trace?.({ kind: "correction", state: "started" });
      output = await budget.run(() => { deps.draft?.({ kind: "reset" }); return deps.repair(request, output.text, validationCode, budget, deps.draft).then(clean); });
      deps.trace?.({ kind: "correction", state: "completed" });
      usage = { inputTokens: usage.inputTokens === null || output.usage.inputTokens === null ? null : usage.inputTokens + output.usage.inputTokens, outputTokens: usage.outputTokens === null || output.usage.outputTokens === null ? null : usage.outputTokens + output.usage.outputTokens, totalTokens: usage.totalTokens === null || output.usage.totalTokens === null ? null : usage.totalTokens + output.usage.totalTokens };
      // A correction that drops every marker the draft carried is not a correction; it must not be saved as a complete answer.
      if (cited && !marked.test(output.text)) throw new Error("INVALID_CITATION");
      checked = await validate(output.text);
      deps.trace?.({ kind: "validation", result: checked.kind, code: checked.kind === "invalid" ? checked.code : null });
    }
    if (checked.kind === "invalid") throw new Error(checked.code);
    await event("validation", "completed");
    const briefId = await budget.run(() => deps.finish("complete", deps.coverage ? { ...checked.value, coverage: deps.coverage() } : checked.value, checked.snapshots, null, usage));
    if (!briefId) return { status: "timed_out", briefId: null, code: "TIMED_OUT" } as const;
    return { status: "complete", briefId, code: null } as const;
  } catch (error) {
    const status = error instanceof BudgetError ? error.code === "TIMED_OUT" ? "timed_out" : error.code === "CANCELLED" ? "cancelled" : "failed" : "failed";
    const allowedCodes = ["INVALID_SCHEMA", "INVALID_CITATION", "MISPLACED_CITATION", "SOURCE_ACCESS_DENIED", "SOURCE_ACCESS_UNAVAILABLE", "MODEL_RATE_LIMITED", "MODEL_UNAVAILABLE", "MODEL_FAILED"];
    const code = error instanceof BudgetError ? error.code : error instanceof Error && allowedCodes.includes(error.message) ? error.message : "ANALYSIS_FAILED";
    await deps.finish(status, null, [], code, usage);
    return { status, briefId: null, code };
  } finally { budget.dispose(); }
}
