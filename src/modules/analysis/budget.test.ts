import { afterEach, expect, it, vi } from "vitest";
import { createRunBudget, runBoundedSetup } from "./budget";
afterEach(() => { vi.useRealTimers(); });
it("rejects a hanging call at the total deadline", async () => {
  vi.useFakeTimers();
  const budget = createRunBudget();
  const pending = budget.run(() => new Promise<never>(() => {}));
  const rejected = expect(pending).rejects.toMatchObject({ code: "TIMED_OUT" });
  await vi.advanceTimersByTimeAsync(300_000);
  await rejected;
  expect(budget.signal.aborted).toBe(true);
  budget.dispose();
});
it("enforces tool and reasoning caps before the next call starts", () => {
  const budget = createRunBudget();
  try {
    for (let index = 0; index < 12; index++) budget.consume("tool");
    expect(() => budget.consume("tool")).toThrow("TOOL_LIMIT");
    for (let index = 0; index < 6; index++) budget.consume("reasoning");
    expect(() => budget.consume("reasoning")).toThrow("STEP_LIMIT");
    budget.consume("repair"); expect(() => budget.consume("repair")).toThrow("REPAIR_LIMIT");
  } finally { budget.dispose(); }
});
it("propagates cancellation without waiting for a noncooperative provider", async () => {
  const controller = new AbortController();
  const budget = createRunBudget(controller.signal);
  const pending = budget.run(() => new Promise<never>(() => {}));
  const rejected = expect(pending).rejects.toMatchObject({ code: "CANCELLED" });
  controller.abort(); await rejected; budget.dispose();
});

it("rejects a result that arrives after the absolute deadline before the timer callback runs", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-27T00:00:00.000Z"));
  const budget = createRunBudget();
  try {
    await expect(budget.run(async () => {
      vi.setSystemTime(new Date("2026-10-27T00:05:00.001Z"));
      return "late result";
    })).rejects.toMatchObject({ code: "TIMED_OUT" });
  } finally { budget.dispose(); }
});

it("reserves the final minute for synthesis without aborting the run", async () => {
  vi.useFakeTimers();
  const budget = createRunBudget();
  expect(budget.canInvestigate()).toBe(true);
  await vi.advanceTimersByTimeAsync(240_000);
  expect(budget.canInvestigate()).toBe(false);
  expect(await budget.run(async () => "answer")).toBe("answer");
  expect(budget.signal.aborted).toBe(false);
  budget.dispose();
});

it("bounds hosted setup from handler entry and aborts the pending operation", async () => {
  vi.useFakeTimers();
  const started = Date.now();
  let setupSignal: AbortSignal | undefined;
  const pending = runBoundedSetup(new AbortController().signal, started, true, async (signal) => { setupSignal = signal; return new Promise<never>(() => {}); });
  const result = expect(pending).rejects.toMatchObject({ code: "TIMED_OUT" });
  await vi.advanceTimersByTimeAsync(270_000);
  await result;
  expect(setupSignal?.aborted).toBe(true);
});

it("honors the persisted deadline instead of starting a fresh deadline", async () => {
  vi.useFakeTimers();
  const budget = createRunBudget(undefined, Date.now() + 100);
  const pending = budget.run(() => new Promise(() => {}));
  const observed = expect(pending).rejects.toMatchObject({ code: "TIMED_OUT" });
  await vi.advanceTimersByTimeAsync(101);
  await observed; budget.dispose(); vi.useRealTimers();
});

it("classifies a provider rejection after the absolute deadline as timed out",async()=>{
 vi.useFakeTimers();const start=Date.now();const budget=createRunBudget(undefined,start+100);
 await expect(budget.run(async()=>{vi.setSystemTime(start+101);throw Error("provider aborted");})).rejects.toMatchObject({code:"TIMED_OUT"});budget.dispose();vi.useRealTimers();
});

it("times out a hosted run at 240 seconds", async () => {
  vi.useFakeTimers();
  const pending = runBoundedSetup(new AbortController().signal, Date.now(), true, () => new Promise<never>(() => {}));
  const rejected = expect(pending).rejects.toMatchObject({ code: "TIMED_OUT" });
  await vi.advanceTimersByTimeAsync(240_000);
  await rejected;
});
