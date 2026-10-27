import { executionLimits } from "@/lib/contracts/limits";

type BudgetKind = "tool" | "reasoning" | "planner" | "repair";
export class BudgetError extends Error {
  constructor(public readonly code: "TIMED_OUT" | "CANCELLED" | "TOOL_LIMIT" | "STEP_LIMIT" | "PLANNER_LIMIT" | "REPAIR_LIMIT") { super(code); }
}

export function createRunBudget(externalSignal?: AbortSignal) {
  const controller = new AbortController();
  const deadline = Date.now() + executionLimits.deadlineMs;
  const counts = { tool: 0, reasoning: 0, planner: 0, repair: 0 };
  const capacities = { tool: executionLimits.toolCalls, reasoning: executionLimits.reasoningSteps, planner: executionLimits.plannerCalls, repair: executionLimits.repairCalls };
  const codes = { tool: "TOOL_LIMIT", reasoning: "STEP_LIMIT", planner: "PLANNER_LIMIT", repair: "REPAIR_LIMIT" } satisfies Record<BudgetKind, ConstructorParameters<typeof BudgetError>[0]>;
  const timeout = setTimeout(() => controller.abort(new BudgetError("TIMED_OUT")), executionLimits.deadlineMs);
  const cancel = () => controller.abort(new BudgetError("CANCELLED"));
  if (externalSignal?.aborted) cancel();
  else externalSignal?.addEventListener("abort", cancel, { once: true });
  function check() {
    if (Date.now() >= deadline && !controller.signal.aborted) controller.abort(new BudgetError("TIMED_OUT"));
    if (controller.signal.aborted) {
      const reason: unknown = controller.signal.reason;
      throw reason instanceof BudgetError ? reason : new BudgetError("CANCELLED");
    }
  }
  return {
    signal: controller.signal,
    remainingMs: () => Math.max(0, deadline - Date.now()),
    consume(kind: BudgetKind) {
      check();
      if (counts[kind] >= capacities[kind]) throw new BudgetError(codes[kind]);
      counts[kind] += 1;
    },
    async run<T>(operation: () => Promise<T>): Promise<T> {
      check();
      let onAbort: () => void = () => {};
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () => { try { check(); } catch (error) { reject(error); } };
        controller.signal.addEventListener("abort", onAbort, { once: true });
      });
      try {
        const result = await Promise.race([Promise.resolve().then(() => { check(); return operation(); }), aborted]);
        check();
        return result;
      }
      finally { controller.signal.removeEventListener("abort", onAbort); }
    },
    dispose() {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", cancel);
    },
  };
}
