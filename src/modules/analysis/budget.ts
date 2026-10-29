import { executionLimits } from "@/lib/contracts/limits";

type BudgetKind = "tool" | "reasoning" | "repair";
export class BudgetError extends Error {
  constructor(public readonly code: "TIMED_OUT" | "CANCELLED" | "TOOL_LIMIT" | "STEP_LIMIT" | "REPAIR_LIMIT") { super(code); }
}

export async function runBoundedSetup<T>(requestSignal: AbortSignal, startedAt: number, hosted: boolean, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort(new BudgetError("CANCELLED"));
  if (requestSignal.aborted) cancel();
  else requestSignal.addEventListener("abort", cancel, { once: true });
  const timeout = hosted ? setTimeout(() => controller.abort(new BudgetError("TIMED_OUT")), Math.max(0, startedAt + executionLimits.hostedDeadlineMs - Date.now())) : undefined;
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(controller.signal.reason);
    if (controller.signal.aborted) onAbort();
    else controller.signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([Promise.resolve().then(() => { controller.signal.throwIfAborted(); return operation(controller.signal); }), aborted]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    requestSignal.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", onAbort);
  }
}

export function createRunBudget(externalSignal?: AbortSignal, deadlineAt?: number) {
  const controller = new AbortController();
  const deadline = Math.min(Date.now() + executionLimits.deadlineMs, deadlineAt ?? Infinity);
  const counts = { tool: 0, reasoning: 0, repair: 0 };
  const capacities = { tool: executionLimits.toolCalls, reasoning: executionLimits.reasoningSteps, repair: executionLimits.repairCalls };
  const codes = { tool: "TOOL_LIMIT", reasoning: "STEP_LIMIT", repair: "REPAIR_LIMIT" } satisfies Record<BudgetKind, ConstructorParameters<typeof BudgetError>[0]>;
  const timeout = setTimeout(() => controller.abort(new BudgetError("TIMED_OUT")), Math.max(0, deadline - Date.now()));
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
    canInvestigate: () => !controller.signal.aborted && deadline - Date.now() > executionLimits.synthesisReserveMs && counts.tool < capacities.tool && counts.reasoning < capacities.reasoning - 1,
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
      catch (error) { check(); throw error; }
      finally { controller.signal.removeEventListener("abort", onAbort); }
    },
    dispose() {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", cancel);
    },
  };
}
