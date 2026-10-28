import { afterEach, expect, it, vi } from "vitest";
import { createRunBudget } from "./budget";
afterEach(() => { vi.useRealTimers(); });
it("rejects a hanging call at the total deadline", async () => {
  vi.useFakeTimers();
  const budget = createRunBudget();
  const pending = budget.run(() => new Promise<never>(() => {}));
  const rejected = expect(pending).rejects.toMatchObject({ code: "TIMED_OUT" });
  await vi.advanceTimersByTimeAsync(90_000);
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
    budget.consume("planner"); expect(() => budget.consume("planner")).toThrow("PLANNER_LIMIT");
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
      vi.setSystemTime(new Date("2026-10-27T00:01:30.001Z"));
      return "late result";
    })).rejects.toMatchObject({ code: "TIMED_OUT" });
  } finally { budget.dispose(); }
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
