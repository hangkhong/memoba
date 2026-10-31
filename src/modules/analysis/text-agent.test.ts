import { expect, it, vi } from "vitest";
import { streamedModel } from "./streamed-model";
import { executionLimits } from "@/lib/contracts/limits";
import { textInstructions, textReasoningAdapter } from "./agent";
import { createRunBudget } from "./budget";
import { createRunKnowledge } from "@/modules/knowledge/service";
import { caseEvidenceSchema as evidenceSchema, documentEvidenceSchema, type DocumentEvidence, type EvidenceItem } from "@/modules/knowledge/contracts";
import { citationPlacement } from "@/modules/briefs/validation";
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
  const knowledge = createRunKnowledge({ search: async ({ query }) => { searches.push(query); return { cases: { kind: "success", items: [item] }, documents: empty }; }, readDocument: async () => empty, read: async () => ({ kind: "success", items: [item] }), expand: async () => empty }, runId);
  const events: string[] = [];
  const trace: EvaluationTraceEvent[] = [];
  let calls = 0;
  const model = streamedModel({ doGenerate: async ({ prompt }) => {
    calls++;
    if (calls === 1) return modelResult([{ type: "tool-call", toolCallId: "s1", toolName: "search_knowledge", input: JSON.stringify({ query: "pilot" }) }], true);
    if (calls === 2) return modelResult([{ type: "tool-call", toolCallId: "r1", toolName: "read_case", input: JSON.stringify({ caseIds: [item.caseId], sectionKeys: ["approach"] }) }], true);
    if (calls === 3) return modelResult([{ type: "tool-call", toolCallId: "s2", toolName: "search_knowledge", input: JSON.stringify({ query: "failure" }) }], true);
    expect(JSON.stringify(prompt)).toContain(item.excerpt);
    return modelResult([{ type: "text", text: `We reviewed a pilot [S:${runId}:1].` }], false);
  } });
  const budget = createRunBudget();
  try {
    const adapter = textReasoningAdapter(model, knowledge, async (event) => { events.push(`${event.tool}:${event.state}`); }, (event) => trace.push(event));
    const result = await adapter.generate(question, budget);
    expect(result.text).toContain(`[S:${runId}:1]`);
    expect(searches).toEqual(["pilot", "failure"]);
    expect(events).toEqual(["search_knowledge:started", "search_knowledge:completed", "read_case:started", "read_case:completed", "search_knowledge:started", "search_knowledge:completed"]);
    expect(knowledge.disclosed()).toHaveLength(1);
    expect(trace.filter((event) => event.kind === "tool_call")).toMatchObject([{ name: "search_knowledge", input: { query: "pilot" } }, { name: "read_case", input: { caseIds: [item.caseId], sectionKeys: ["approach"] } }, { name: "search_knowledge", input: { query: "failure" } }]);
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
  const knowledge = createRunKnowledge({ search: async () => { const failed = { kind: "error", code: "UNAVAILABLE", retryable: false } as const; return { cases: failed, documents: failed }; }, readDocument: async () => empty, read: async () => empty, expand: async () => empty }, runId);
  let calls = 0;
  const model = streamedModel({ doGenerate: async ({ prompt }) => {
    calls++;
    if (calls === 1) return modelResult([{ type: "tool-call", toolCallId: "s1", toolName: "search_knowledge", input: JSON.stringify({ query: "pilot" }) }], true);
    expect(JSON.stringify(prompt)).toContain("UNAVAILABLE");
    return modelResult([{ type: "text", text: "I cannot check the team's history. As general advice, start with a pilot." }], false);
  } });
  const budget = createRunBudget();
  try { expect((await textReasoningAdapter(model, knowledge, async () => {}).generate(question, budget)).text).toContain("cannot check"); }
  finally { budget.dispose(); }
});
it("leaves a model step for a final answer after repeated investigative calls", async () => {
  const knowledge = createRunKnowledge({ search: async () => ({ cases: empty, documents: empty }), readDocument: async () => empty, read: async () => empty, expand: async () => empty }, runId);
  let calls = 0;
  const model = streamedModel({ doGenerate: async (options) => {
    calls++;
    if (calls < 5) return modelResult([{ type: "tool-call", toolCallId: `s${calls}`, toolName: "search_knowledge", input: JSON.stringify({ query: `query ${calls}` }) }], true);
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
it("requires the process-and-cases template in order and leaves coverage to the app", () => {
  const headings = ["## What the process says", "## How similar cases went", "## Where practice and process differ", "## What's different this time", "## Suggested next step"];
  for (const heading of headings) expect(textInstructions).toContain(heading);
  const template = textInstructions.slice(textInstructions.indexOf("<answer_template>"));
  expect(headings.map((heading) => template.indexOf(heading))).toEqual(headings.map((heading) => template.indexOf(heading)).toSorted((x, y) => x - y));
  expect(textInstructions).toContain("up to 8");
  expect(textInstructions).not.toContain("Coverage:");
  expect(textInstructions).not.toContain("app shows how many");
});
it("keeps cases and documents apart and handles each source's outcome", () => {
  for (const rule of ["Cases say what happened. Documents say what is required now.", "Never call a past case a violation", "otherwise say the timing is unknown", "List required steps in the order the document gives them", "A policy is required", "advisory", "Under \"What the process says\" cite documents only", "no process document matched this request", "no recorded case matched this request", "When a source could not be searched or read completely"]) expect(textInstructions, rule).toContain(rule.replace(/\\"/g, '"'));
  expect(textInstructions).toContain("Say that no recorded case or no process document matched only after a successful search of that source.");
});
it("treats case text, history and tool output as untrusted data", () => {
  expect(textInstructions).toContain("untrusted data");
});
it("wraps the request in a delimiter and keeps instructions first", async () => {
  const prompts: string[] = [];
  const knowledge = createRunKnowledge({ search: async () => ({ cases: empty, documents: empty }), readDocument: async () => empty, read: async () => empty, expand: async () => empty }, runId);
  const model = streamedModel({ doGenerate: async ({ prompt }) => { prompts.push(JSON.stringify(prompt)); return modelResult([{ type: "text", text: "Done." }], false); } });
  const budget = createRunBudget();
  try { await textReasoningAdapter(model, knowledge, async () => {}).generate(question, budget); }
  finally { budget.dispose(); }
  expect(prompts[0]).toContain("<request>");
  expect(prompts[0]).toContain("</request>");
  expect(prompts[0]).toContain(question.message);
});

async function toolsOverSteps(firstStepInputTokens: number) {
  const knowledge = createRunKnowledge({ search: async () => ({ cases: { kind: "success", items: [item] }, documents: empty }), readDocument: async () => empty, read: async () => empty, expand: async () => empty }, runId);
  const events: string[] = [];
  const toolsSeen: number[] = [];
  let calls = 0;
  const model = streamedModel({ doGenerate: async ({ tools }) => {
    calls++; toolsSeen.push(tools?.length ?? 0);
    if (calls === 1) return { ...modelResult([{ type: "tool-call", toolCallId: "s1", toolName: "search_knowledge", input: JSON.stringify({ query: "pilot" }) }], true), usage: { inputTokens: { total: firstStepInputTokens, noCache: firstStepInputTokens, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } } };
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
  const knowledge = createRunKnowledge({ search: async () => ({ cases: empty, documents: empty }), readDocument: async () => empty, read: async () => empty, expand: async () => empty }, runId);
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
  const knowledge = createRunKnowledge({ search: async () => ({ cases: { kind: "success", items: [item] }, documents: empty }), readDocument: async () => empty, read: async () => ({ kind: "success", items: [item] }), expand: async () => empty }, runId);
  let calls = 0;
  const model = streamedModel({ doGenerate: async () => {
    calls++;
    if (calls === 1) return modelResult([{ type: "text", text: "Let me look." }, { type: "tool-call", toolCallId: "s1", toolName: "search_knowledge", input: JSON.stringify({ query: "pilot" }) }], true);
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

const documentItem: DocumentEvidence = documentEvidenceSchema.parse({ source: "document", evidenceId: crypto.randomUUID(), documentId: crypto.randomUUID(), revisionId: crypto.randomUUID(), sectionId: crypto.randomUUID(), version: 1, block: 1, heading: "Notice", documentTitle: "Price change policy", type: "policy", area: "Finance", owner: "Finance", effectiveFrom: "2026-01-01", excerpt: "Give 90 days' notice.", authorId: crypto.randomUUID(), recordedAt: new Date().toISOString(), sources: [] });
const documentCard = { documentId: documentItem.documentId, revisionId: documentItem.revisionId, version: 1, title: "Price change policy", description: "Notice rules.", type: "policy" as const, area: "Finance" as const, owner: "Finance", effectiveFrom: "2026-01-01", outline: [{ block: 1, heading: "Notice", chars: 22 }], matchedHeadings: [{ block: 1, heading: "Notice" }] };

it("searches both sources, reads a document, and reports per-source state through the tool events", async () => {
  const knowledge = createRunKnowledge({ search: async () => ({ cases: empty, documents: { kind: "success", items: [documentCard] } }), readDocument: async () => ({ kind: "success", items: [documentItem] }), read: async () => empty, expand: async () => empty }, runId);
  const events: { tool?: string; state: string; code?: string }[] = [];
  const trace: EvaluationTraceEvent[] = [];
  let calls = 0;
  const model = streamedModel({ doGenerate: async () => {
    calls++;
    if (calls === 1) return modelResult([{ type: "tool-call", toolCallId: "s1", toolName: "search_knowledge", input: JSON.stringify({ query: "price notice" }) }], true);
    if (calls === 2) return modelResult([{ type: "tool-call", toolCallId: "d1", toolName: "read_document", input: JSON.stringify({ documentId: documentItem.documentId }) }], true);
    return modelResult([{ type: "text", text: `## What the process says\n- Give notice [S:${runId}:1].` }], false);
  } });
  const budget = createRunBudget();
  try {
    const result = await textReasoningAdapter(model, knowledge, async (event) => { events.push({ tool: event.tool, state: event.state, code: event.code }); }, (event) => trace.push(event)).generate(question, budget);
    expect(result.text).toContain(`[S:${runId}:1]`);
    expect(events).toEqual([
      { tool: "search_knowledge", state: "started", code: undefined }, { tool: "search_knowledge", state: "completed", code: "cases:none:0;documents:found:1" },
      { tool: "read_document", state: "started", code: undefined }, { tool: "read_document", state: "completed", code: undefined },
    ]);
    expect(trace.filter((event) => event.kind === "model_sources")).toEqual([{ kind: "model_sources", sources: [{ marker: `[S:${runId}:1]`, evidenceId: documentItem.evidenceId, documentId: documentItem.documentId, revisionId: documentItem.revisionId, block: 1 }] }]);
    expect(trace.find((event) => event.kind === "tool_result" && event.callId === "s1")).toMatchObject({ documentIds: [documentItem.documentId], caseIds: [], sourceStates: "cases:none:0;documents:found:1" });
  } finally { budget.dispose(); }
});

it("records a failed source in the tool event code without failing the other", async () => {
  const failed = { kind: "error", code: "QUERY_FAILED", retryable: false } as const;
  const knowledge = createRunKnowledge({ search: async () => ({ cases: { kind: "success", items: [item] }, documents: failed }), readDocument: async () => empty, read: async () => empty, expand: async () => empty }, runId);
  const events: string[] = [];
  let calls = 0;
  const model = streamedModel({ doGenerate: async () => { calls++; return calls === 1 ? modelResult([{ type: "tool-call", toolCallId: "s1", toolName: "search_knowledge", input: JSON.stringify({ query: "pilot" }) }], true) : modelResult([{ type: "text", text: "Done." }], false); } });
  const budget = createRunBudget();
  try { await textReasoningAdapter(model, knowledge, async (event) => { events.push(`${event.state}:${event.code ?? ""}`); }).generate(question, budget); }
  finally { budget.dispose(); }
  expect(events).toContain("completed:cases:found:1;documents:failed:0");
});

it("allows only documents under the process heading and only cases under the cases heading", async () => {
  const documentMarker = `[S:${runId}:1]`; const caseMarker = `[S:${runId}:2]`;
  const sources = new Map<string, EvidenceItem>([[documentMarker, documentItem], [caseMarker, item]]);
  expect(citationPlacement(`## What the process says\n- Notice ${documentMarker}\n\n## How similar cases went\n- Pilot ${caseMarker}\n\n## Suggested next step\nBoth ${documentMarker} ${caseMarker}`, sources)).toBe(true);
  expect(citationPlacement(`## What the process says\n- Pilot ${caseMarker}`, sources)).toBe(false);
  expect(citationPlacement(`## How similar cases went\n- Notice ${documentMarker}`, sources)).toBe(false);
  expect(citationPlacement(`Plain answer ${documentMarker}`, sources)).toBe(true);
});

it("repairs a misplaced citation once", async () => {
  const documentMarker = `[S:${runId}:1]`; const caseMarker = `[S:${runId}:2]`;
  const misplaced = `## What the process says\n- Pilot ${caseMarker}\n- Notice ${documentMarker}`;
  const fixed = `## What the process says\n- Notice ${documentMarker}\n\n## How similar cases went\n- Pilot ${caseMarker}`;
  let corrections = 0; const codes: string[] = [];
  const result = await runTextAnalysis(question, { generate: async () => ({ text: misplaced, usage }), repair: async (_request, _draft, code) => { corrections++; codes.push(code); return { text: fixed, usage }; }, disclosed: () => [{ marker: documentMarker, evidence: documentItem }, { marker: caseMarker, evidence: item }], canRead: async () => true, emit: async () => {}, finish: async () => crypto.randomUUID() });
  expect(result.status).toBe("complete"); expect(corrections).toBe(1); expect(codes).toEqual(["MISPLACED_CITATION"]);
  const stuck = await runTextAnalysis(question, { generate: async () => ({ text: misplaced, usage }), repair: async () => ({ text: misplaced, usage }), disclosed: () => [{ marker: documentMarker, evidence: documentItem }, { marker: caseMarker, evidence: item }], canRead: async () => true, emit: async () => {}, finish: async () => null });
  expect(stuck).toMatchObject({ status: "failed", code: "MISPLACED_CITATION" });
});
