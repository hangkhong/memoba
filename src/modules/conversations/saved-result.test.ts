import { expect, it } from "vitest";
import type { ConversationDetail } from "./view-schema.ts";
import { hasRunningRun, isAwaitingSaved, watchSavedResult } from "./saved-result.ts";

function detailWith(status: "running" | "complete", runId = "run-1"): ConversationDetail {
  return { conversation: {}, turns: [{ runs: [{ id: runId, status }] }] } as unknown as ConversationDetail;
}
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

it("never starts a read before the previous one finished, even when reads are slower than the poll delay", async () => {
  let inFlight = 0; let maxInFlight = 0; let calls = 0;
  const seen: ConversationDetail[] = [];
  const result = await watchSavedResult({
    delayMs: 5,
    signal: new AbortController().signal,
    load: async () => {
      inFlight++; maxInFlight = Math.max(maxInFlight, inFlight); calls++;
      await wait(40);
      inFlight--;
      return detailWith(calls >= 3 ? "complete" : "running");
    },
    settled: (detail) => !hasRunningRun(detail),
    onDetail: (detail) => seen.push(detail),
  });
  expect(result).toBe("settled");
  expect(maxInFlight).toBe(1);
  expect(calls).toBe(3);
  expect(seen.at(-1)?.turns[0]?.runs[0]?.status).toBe("complete");
});

it("reports a failed read after repeated failures instead of polling forever", async () => {
  let calls = 0;
  const result = await watchSavedResult({
    delayMs: 1, maxFailures: 3,
    signal: new AbortController().signal,
    load: async () => { calls++; throw new Error("503"); },
    settled: () => false,
    onDetail: () => { throw new Error("unexpected"); },
  });
  expect(result).toBe("failed");
  expect(calls).toBe(3);
});

it("recovers from a single failed read and stops quietly when aborted", async () => {
  let calls = 0;
  const result = await watchSavedResult({
    delayMs: 1, signal: new AbortController().signal,
    load: async () => { if (++calls === 1) throw new Error("blip"); return detailWith("complete"); },
    settled: (detail) => !hasRunningRun(detail),
    onDetail: () => {},
  });
  expect(result).toBe("settled");
  const abort = new AbortController();
  const pending = watchSavedResult({ delayMs: 1000, signal: abort.signal, load: async () => detailWith("running"), settled: () => false, onDetail: () => {} });
  await wait(10); abort.abort();
  expect(await pending).toBe("aborted");
});

it("treats a run as awaiting until the saved copy is terminal", () => {
  expect(isAwaitingSaved(detailWith("running"), "run-1")).toBe(true);
  expect(isAwaitingSaved(detailWith("complete"), "run-1")).toBe(false);
  expect(isAwaitingSaved(detailWith("complete"), null)).toBe(false);
  expect(isAwaitingSaved(detailWith("complete", "other"), "run-1")).toBe(true);
});
