import { afterEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { executionLimits, inputLimits } from "@/lib/contracts/limits";
import { draftCaseFromText } from "./draft";
import { draftRequestSchema } from "./draft-contract";

const blank = { template: "product_delivery", title: "", problem: "", context: "", constraints: "", approach: "", outcome: "unknown", observedOutcome: "", lessons: "", deliverable: "", changeScope: "", deploymentConditions: "", customerImpact: "", handlingConditions: "", escalationNotes: "" };
function modelReturning(partial: Record<string, string>) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text" as const, text: partial.raw ?? JSON.stringify({ ...blank, ...partial }) }],
      finishReason: { unified: "stop" as const, raw: undefined },
      usage: { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } },
      warnings: [],
    }),
  });
}
const request = draftRequestSchema.parse({ description: "We moved invoices to a new queue." });

afterEach(() => vi.useRealTimers());

describe("draftCaseFromText", () => {
  it("maps model output to a form draft and lists missing required sections", async () => {
    const result = await draftCaseFromText(request, { model: modelReturning({ title: "Queue move", problem: "Invoices were slow.", approach: "Move to a queue." }) });
    expect(result).toMatchObject({ kind: "draft", missing: ["context"], draft: { title: "Queue move", problem: "Invoices were slow.", sources: [], conceptIds: [] } });
  });
  it("forces unknown outcome when no observed result is drafted", async () => {
    const result = await draftCaseFromText(request, { model: modelReturning({ problem: "p", context: "c", approach: "a", outcome: "achieved", observedOutcome: "  " }) });
    expect(result).toMatchObject({ kind: "draft", draft: { outcome: "unknown", observedOutcome: "" } });
  });
  it("keeps a known outcome that has a described result", async () => {
    const result = await draftCaseFromText(request, { model: modelReturning({ problem: "p", context: "c", approach: "a", outcome: "not_achieved", observedOutcome: "It failed." }) });
    expect(result).toMatchObject({ kind: "draft", draft: { outcome: "not_achieved", observedOutcome: "It failed." }, missing: [] });
  });
  it("returns INVALID_OUTPUT when the model output does not parse", async () => {
    expect(await draftCaseFromText(request, { model: modelReturning({ raw: "not json" }) })).toEqual({ kind: "error", code: "INVALID_OUTPUT" });
    expect(await draftCaseFromText(request, { model: modelReturning({ raw: JSON.stringify({ template: "other" }) }) })).toEqual({ kind: "error", code: "INVALID_OUTPUT" });
  });
  it("returns PROVIDER_ERROR when the model call fails", async () => {
    const model = new MockLanguageModelV4({ doGenerate: async () => { throw new Error("boom"); } });
    expect(await draftCaseFromText(request, { model })).toEqual({ kind: "error", code: "PROVIDER_ERROR" });
  });
  it("returns TIMED_OUT after the draft deadline", async () => {
    vi.useFakeTimers();
    const model = new MockLanguageModelV4({ doGenerate: ({ abortSignal }) => new Promise((_, reject) => abortSignal?.addEventListener("abort", () => reject(abortSignal.reason))) });
    const pending = draftCaseFromText(request, { model });
    await vi.advanceTimersByTimeAsync(executionLimits.draftDeadlineMs);
    expect(await pending).toEqual({ kind: "error", code: "TIMED_OUT" });
  });
  it("sends file names as context but no file content", async () => {
    const model = modelReturning({ problem: "p", context: "c", approach: "a" });
    await draftCaseFromText(draftRequestSchema.parse({ description: "Notes", fileNames: ["postmortem.pdf"] }), { model });
    const prompt = JSON.stringify(model.doGenerateCalls[0]?.prompt);
    expect(prompt).toContain("postmortem.pdf");
  });
});

describe("draftRequestSchema", () => {
  it("rejects text over the import limit", () => {
    expect(draftRequestSchema.safeParse({ description: "x".repeat(inputLimits.importText + 1) }).success).toBe(false);
    expect(draftRequestSchema.safeParse({ description: "   " }).success).toBe(false);
    expect(draftRequestSchema.safeParse({ description: "x".repeat(inputLimits.importText) }).success).toBe(true);
  });
});
