import { expect, it, vi } from "vitest";
import { streamedModel } from "./streamed-model";
import { executionLimits } from "@/lib/contracts/limits";
import { textInstructions, textReasoningAdapter } from "./agent";
import { createRunBudget } from "./budget";
import { createRunKnowledge } from "@/modules/knowledge/service";
import { evidenceSchema } from "@/modules/knowledge/contracts";
import { runTextAnalysis } from "./harness";
import type { TextAnswer } from "@/modules/briefs/schema";
import type { EvaluationTraceEvent } from "./evaluation-trace";

const runId = crypto.randomUUID();
const item = evidenceSchema.parse({ evidenceId: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionId: crypto.randomUUID(), sectionId: crypto.randomUUID(), sectionKey: "approach", caseTitle: "Pilot", excerpt: "A pilot was reviewed", outcome: "achieved", authorId: crypto.randomUUID(), recordedAt: new Date().toISOString(), sources: [], purpose: "method", retrievalReason: "fixture" });
const question = { version: 2 as const, message: "How did we roll out?", history: [] };
const empty = { kind: "empty" as const, items: [] as [] };
const usage = { inputTokens: 1, outputTokens: 1, totalTokens: 2 };
function modelResult(content: ({ type: "text"; text: string } | { type: "tool-call"; toolCallId: string; toolName: string; input: string })[], toolCall: boolean) { return { content, finishReason: { unified: toolCall ? "tool-calls" as const : "stop" as const, raw: undefined }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } }, warnings: [] }; }
it("lets the model search, read, revise its search and answer using the disclosed source", async () => {
  const searches: string[] = [];
  const knowledge = createRunKnowledge({ search: async ({ query }) => { searches.push(query); return { kind: "success", items: [item] }; }, read: async () => ({ kind: "success", items: [item] }), expand: async () => empty }, runId);
  const events: string[] = [];
  const trace: EvaluationTraceEvent[] = [];
  let calls = 0;
  const model = streamedModel({ doGenerate: async ({ prompt }) => {
    calls++;
    if (calls === 1) return modelResult([{ type: "tool-call", toolCallId: "s1", toolName: "search_cases", input: JSON.stringify({ query: "pilot" }) }], true);
    if (calls === 2) return modelResult([{ type: "tool-call", toolCallId: "r1", toolName: "read_case", input: JSON.stringify({ caseIds: [item.caseId], sectionKeys: ["approach"] }) }], true);
    if (calls === 3) return modelResult([{ type: "tool-call", toolCallId: "s2", toolName: "search_cases", input: JSON.stringify({ query: "failure" }) }], true);
    expect(JSON.stringify(prompt)).toContain(item.excerpt);
    return modelResult([{ type: "text", text: `We reviewed a pilot [S:${runId}:1].` }], false);
  } });
  const budget = createRunBudget();
  try {
    const adapter = textReasoningAdapter(model, knowledge, async (event) => { events.push(`${event.tool}:${event.state}`); }, (event) => trace.push(event));
    const result = await adapter.generate(question, budget);
    expect(result.text).toContain(`[S:${runId}:1]`);
    expect(searches).toEqual(["pilot", "failure"]);
    expect(events).toEqual(["search_cases:started", "search_cases:completed", "read_case:started", "read_case:completed", "search_cases:started", "search_cases:completed"]);
    expect(knowledge.disclosed()).toHaveLength(1);
    expect(trace.filter((event) => event.kind === "tool_call")).toMatchObject([{ name: "search_cases", input: { query: "pilot" } }, { name: "read_case", input: { caseIds: [item.caseId], sectionKeys: ["approach"] } }, { name: "search_cases", input: { query: "failure" } }]);
    expect(trace.filter((event) => event.kind === "model_sources")).toEqual([{ kind: "model_sources", sources: [{ marker: `[S:${runId}:1]`, evidenceId: item.evidenceId, caseId: item.caseId, revisionId: item.revisionId, sectionKey: "approach" }] }]);
    expect(JSON.stringify(trace)).not.toContain(item.excerpt);
  } finally { budget.dispose(); }
});
it("saves direct clarification without forcing search", async () => {
  const saved: string[] = [];
  const result = await runTextAnalysis(question, { generate: async () => ({ text: "Which launch do you mean?", usage }), repair: async () => { throw new Error("unexpected repair"); }, disclosed: () => [], canRead: async () => true, emit: async () => {}, finish: async (state, answer) => { saved.push(state, answer?.text ?? ""); return crypto.randomUUID(); } });
  expect(result.status).toBe("complete");
  expect(saved).toEqual(["complete", "Which launch do you mean?"]);
});
it("repairs an unread or stale source at most once and fails if the correction remains invalid", async () => {
  let corrections = 0;
  const saved: string[] = [];
  const trace: EvaluationTraceEvent[] = [];
  const text = `[S:${crypto.randomUUID()}:1]`;
  const result = await runTextAnalysis(question, { generate: async () => ({ text, usage }), repair: async () => { corrections++; return { text, usage }; }, disclosed: () => [], canRead: async () => true, emit: async () => {}, finish: async (state) => { saved.push(state); return null; }, trace: (event) => trace.push(event) });
  expect(corrections).toBe(1);
  expect(result).toMatchObject({ status: "failed", code: "INVALID_CITATION" });
  expect(saved).toEqual(["failed"]);
  expect(trace).toEqual([{ kind: "validation", result: "invalid", code: "INVALID_CITATION" }, { kind: "correction", state: "started" }, { kind: "correction", state: "completed" }, { kind: "validation", result: "invalid", code: "INVALID_CITATION" }]);
});
it("saves only cited source snapshots and rejects loss of source access", async () => {
  const marker = `[S:${runId}:1]`;
  const saved: unknown[] = [];
  const deps = { generate: async () => ({ text: `Pilot ${marker}`, usage }), repair: async () => { throw new Error("unexpected repair"); }, disclosed: () => [{ marker, evidence: item }], canRead: async () => true, emit: async () => {}, finish: async (state: string, answer: unknown, snapshots: unknown) => { saved.push(state, answer, snapshots); return crypto.randomUUID(); } };
  expect((await runTextAnalysis(question, deps)).status).toBe("complete");
  expect(saved[2]).toEqual([item]);
  expect((await runTextAnalysis(question, { ...deps, canRead: async () => false })).code).toBe("SOURCE_ACCESS_DENIED");
});
it("sends a failed search to the model as an error and permits an uncited answer", async () => {
  const knowledge = createRunKnowledge({ search: async () => ({ kind: "error", code: "UNAVAILABLE", retryable: false }), read: async () => empty, expand: async () => empty }, runId);
  let calls = 0;
  const model = streamedModel({ doGenerate: async ({ prompt }) => {
    calls++;
    if (calls === 1) return modelResult([{ type: "tool-call", toolCallId: "s1", toolName: "search_cases", input: JSON.stringify({ query: "pilot" }) }], true);
    expect(JSON.stringify(prompt)).toContain("UNAVAILABLE");
    return modelResult([{ type: "text", text: "I cannot check the team's history. As general advice, start with a pilot." }], false);
  } });
  const budget = createRunBudget();
  try { expect((await textReasoningAdapter(model, knowledge, async () => {}).generate(question, budget)).text).toContain("cannot check"); }
  finally { budget.dispose(); }
});
it("leaves a model step for a final answer after repeated investigative calls", async () => {
  const knowledge = createRunKnowledge({ search: async () => empty, read: async () => empty, expand: async () => empty }, runId);
  let calls = 0;
  const model = streamedModel({ doGenerate: async (options) => {
    calls++;
    if (calls < 5) return modelResult([{ type: "tool-call", toolCallId: `s${calls}`, toolName: "search_cases", input: JSON.stringify({ query: `query ${calls}` }) }], true);
    expect(options.tools?.length ?? 0).toBe(0);
    return modelResult([{ type: "text", text: "No cases were found." }], false);
  } });
  const budget = createRunBudget();
  try { expect((await textReasoningAdapter(model, knowledge, async () => {}).generate(question, budget)).text).toBe("No cases were found."); }
  finally { budget.dispose(); }
  expect(calls).toBe(5);
});
it("times out a hanging model and separately persists the terminal state", async () => {
  vi.useFakeTimers();
  const saved: string[] = [];
  const pending = runTextAnalysis(question, { generate: async () => new Promise(() => {}), repair: async () => { throw Error("unexpected repair"); }, disclosed: () => [], canRead: async () => true, emit: async () => {}, finish: async (state) => { saved.push(state); return null; } });
  await vi.advanceTimersByTimeAsync(300_001);
  expect((await pending).status).toBe("timed_out");
  expect(saved).toEqual(["timed_out"]);
  vi.useRealTimers();
});
it("cancels a hanging model and persists cancellation", async () => {
  const controller = new AbortController();
  const saved: string[] = [];
  const pending = runTextAnalysis(question, { generate: async () => new Promise(() => {}), repair: async () => { throw Error("unexpected repair"); }, disclosed: () => [], canRead: async () => true, emit: async () => {}, finish: async (state) => { saved.push(state); return null; }, signal: controller.signal });
  controller.abort();
  expect((await pending).status).toBe("cancelled");
  expect(saved).toEqual(["cancelled"]);
});
it("records a failure instead of returning an answer when final persistence fails", async () => {
  const states: string[] = [];
  const result = await runTextAnalysis(question, {
    generate: async () => ({ text: "General advice", usage }), repair: async () => { throw Error("unexpected repair"); },
    disclosed: () => [], canRead: async () => true, emit: async () => {},
    finish: async (state) => { states.push(state); if (state === "complete") throw Error("RUN_SAVE_FAILED"); return null; },
  });
  expect(result).toMatchObject({ status: "failed", briefId: null });
  expect(states).toEqual(["complete", "failed"]);
});
it("surfaces a persistence error when terminal cleanup also fails", async () => {
  const finish = vi.fn(async () => { throw Error("RUN_SAVE_FAILED"); });
  await expect(runTextAnalysis(question, {
    generate: async () => ({ text: "General advice", usage }), repair: async () => { throw Error("unexpected repair"); },
    disclosed: () => [], canRead: async () => true, emit: async () => {}, finish,
  })).rejects.toThrow("RUN_SAVE_FAILED");
  expect(finish).toHaveBeenCalledTimes(2);
});
it("checks each citation when contradictory cases are cited together", async () => {
  const other = evidenceSchema.parse({ ...item, evidenceId: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionId: crypto.randomUUID(), sectionId: crypto.randomUUID(), outcome: "not_achieved", excerpt: "The rollout was halted" });
  const first = `[S:${runId}:1]`;
  const second = `[S:${runId}:2]`;
  let snapshots: unknown;
  const result = await runTextAnalysis(question, { generate: async () => ({ text: `A pilot succeeded ${first}, but another rollout was halted ${second}.`, usage }), repair: async () => { throw Error("unexpected repair"); }, disclosed: () => [{ marker: first, evidence: item }, { marker: second, evidence: other }], canRead: async () => true, emit: async () => {}, finish: async (_state, _answer, sources) => { snapshots = sources; return crypto.randomUUID(); } });
  expect(result.status).toBe("complete");
  expect(snapshots).toEqual([item, other]);
});
it("structures the instructions with identity, instructions and context", () => {
  for (const heading of ["# Identity", "# Instructions", "# Context"]) expect(textInstructions).toContain(heading);
  expect(textInstructions).toContain("Write in English");
  expect(textInstructions).not.toContain("${");
});
it("requires the reuse template and leaves coverage to the app", () => {
  for (const heading of ["## How similar cases went", "## What's different this time", "## Suggested next step"]) expect(textInstructions).toContain(heading);
  expect(textInstructions).toContain("up to 8");
  expect(textInstructions).not.toContain("Coverage:");
});
it("handles an empty successful search without filling the precedent section", () => {
  expect(textInstructions).toContain("say that no recorded case matched this request");
  expect(textInstructions).toContain("Say no recorded case matched only after a successful search.");
});
it("treats case text, history and tool output as untrusted data", () => {
  expect(textInstructions).toContain("untrusted data");
});
it("wraps the request in a delimiter and keeps instructions first", async () => {
  const prompts: string[] = [];
  const knowledge = createRunKnowledge({ search: async () => empty, read: async () => empty, expand: async () => empty }, runId);
  const model = streamedModel({ doGenerate: async ({ prompt }) => { prompts.push(JSON.stringify(prompt)); return modelResult([{ type: "text", text: "Done." }], false); } });
  const budget = createRunBudget();
  try { await textReasoningAdapter(model, knowledge, async () => {}).generate(question, budget); }
  finally { budget.dispose(); }
  expect(prompts[0]).toContain("<request>");
  expect(prompts[0]).toContain("</request>");
  expect(prompts[0]).toContain(question.message);
});

async function toolsOverSteps(firstStepInputTokens: number) {
  const knowledge = createRunKnowledge({ search: async () => ({ kind: "success", items: [item] }), read: async () => empty, expand: async () => empty }, runId);
  const events: string[] = [];
  const toolsSeen: number[] = [];
  let calls = 0;
  const model = streamedModel({ doGenerate: async ({ tools }) => {
    calls++; toolsSeen.push(tools?.length ?? 0);
    if (calls === 1) return { ...modelResult([{ type: "tool-call", toolCallId: "s1", toolName: "search_cases", input: JSON.stringify({ query: "pilot" }) }], true), usage: { inputTokens: { total: firstStepInputTokens, noCache: firstStepInputTokens, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } } };
    return modelResult([{ type: "text", text: "Answer from what was read." }], false);
  } });
  const budget = createRunBudget();
  try { await textReasoningAdapter(model, knowledge, async (event) => { events.push(`${event.stage}:${event.state}:${event.code ?? ""}`); }).generate(question, budget); }
  finally { budget.dispose(); }
  return { toolsSeen, events };
}
it("removes tools and records an activity event when step input nears the ceiling", async () => {
  const { toolsSeen, events } = await toolsOverSteps(Math.ceil(executionLimits.maxModelInputTokens * 0.8));
  expect(toolsSeen[0]).toBeGreaterThan(0);
  expect(toolsSeen[1]).toBe(0);
  expect(events).toContain("context:completed:INPUT_CEILING");
});
it("keeps tools available while step input stays below the ceiling", async () => {
  const { toolsSeen, events } = await toolsOverSteps(Math.floor(executionLimits.maxModelInputTokens * 0.8) - 1);
  expect(toolsSeen[1]).toBeGreaterThan(0);
  expect(events).not.toContain("context:completed:INPUT_CEILING");
});

it("builds the repair prompt from static instructions followed by tagged blocks", async () => {
  const prompts: string[] = [];
  const knowledge = createRunKnowledge({ search: async () => empty, read: async () => empty, expand: async () => empty }, runId);
  const model = streamedModel({ doGenerate: async ({ prompt }) => { prompts.push(JSON.stringify(prompt)); return modelResult([{ type: "text", text: "Fixed." }], false); } });
  const budget = createRunBudget();
  try { await textReasoningAdapter(model, knowledge, async () => {}).repair(question, "Draft [S:x:1]", "INVALID_CITATION", budget); }
  finally { budget.dispose(); }
  for (const tag of ["<request>", "<draft>", "<validation_error>", "<allowed_sources>"]) expect(prompts[0]).toContain(tag);
  expect(prompts[0]?.indexOf("Correct the citation markers")).toBeLessThan(prompts[0]?.lastIndexOf("<request>") ?? 0);
});

it("saves the answer with the coverage computed by the run", async () => {
  const coverage = { searched: true, previewed: 5, read: 2, searchFailed: false, unreadTitles: ["Case C"] };
  const saved: (TextAnswer | null)[] = [];
  const result = await runTextAnalysis(question, { generate: async () => ({ text: "General answer.", usage }), repair: async () => { throw new Error("unexpected repair"); }, disclosed: () => [], canRead: async () => true, emit: async () => {}, coverage: () => coverage, finish: async (_state, answer) => { saved.push(answer); return crypto.randomUUID(); } });
  expect(result.status).toBe("complete");
  expect(saved[0]).toMatchObject({ version: 2, text: "General answer.", coverage });
});

it("streams answer text as draft chunks and restarts the draft when a step ends in a tool call", async () => {
  const knowledge = createRunKnowledge({ search: async () => ({ kind: "success", items: [item] }), read: async () => ({ kind: "success", items: [item] }), expand: async () => empty }, runId);
  let calls = 0;
  const model = streamedModel({ doGenerate: async () => {
    calls++;
    if (calls === 1) return modelResult([{ type: "text", text: "Let me look." }, { type: "tool-call", toolCallId: "s1", toolName: "search_cases", input: JSON.stringify({ query: "pilot" }) }], true);
    return modelResult([{ type: "text", text: "A final answer." }], false);
  } });
  const budget = createRunBudget();
  const drafts: string[] = [];
  try {
    const result = await textReasoningAdapter(model, knowledge, async () => {}).generate(question, budget, (chunk) => drafts.push(chunk.kind === "reset" ? "<reset>" : chunk.text));
    expect(drafts).toEqual(["Let me l", "ook.", "<reset>", "A final ", "answer."]);
    expect(result.text).toBe("A final answer.");
  } finally { budget.dispose(); }
});
it("discards the draft before a citation repair and streams the corrected answer", async () => {
  const drafts: string[] = [];
  const saved: string[] = [];
  const result = await runTextAnalysis(question, {
    generate: async (_request, _budget, onDraft) => { onDraft?.({ kind: "delta", text: "Bad [S:x:9]" }); return { text: "Bad [S:x:9]", usage }; },
    repair: async (_request, _draft, _code, _budget, onDraft) => { onDraft?.({ kind: "delta", text: "Fixed." }); return { text: "Fixed.", usage }; },
    draft: (chunk) => drafts.push(chunk.kind === "reset" ? "<reset>" : chunk.text),
    disclosed: () => [], canRead: async () => true, emit: async () => {}, finish: async (state, answer) => { saved.push(state, answer?.text ?? ""); return crypto.randomUUID(); },
  });
  expect(result.status).toBe("complete");
  expect(drafts).toEqual(["Bad [S:x:9]", "<reset>", "Fixed."]);
  expect(saved).toEqual(["complete", "Fixed."]);
});
