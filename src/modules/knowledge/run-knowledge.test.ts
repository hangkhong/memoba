import { expect, it } from "vitest";
import { createRunKnowledge, type KnowledgeStore, type ReadInput } from "./service";
import { evidenceSchema } from "./contracts";

const runId = "11111111-1111-4111-8111-111111111111";
const caseId = "22222222-2222-4222-8222-222222222222";
const revisionId = "33333333-3333-4333-8333-333333333333";
function source(sectionKey: "problem" | "context" | "approach", extra: Record<string, unknown> = {}) {
  const sectionId = crypto.randomUUID();
  return evidenceSchema.parse({ evidenceId: sectionId, caseId, revisionId, sectionId, sectionKey, caseTitle: "Rollout", excerpt: `${sectionKey} evidence`, outcome: "not_achieved", authorId: crypto.randomUUID(), recordedAt: "2026-10-29T00:00:00Z", sources: [], purpose: "method", retrievalReason: "search", ...extra });
}
function store(overrides: Partial<KnowledgeStore>): KnowledgeStore {
  return { search: async () => ({ kind: "empty", items: [] }), read: async () => ({ kind: "empty", items: [] }), expand: async () => ({ kind: "empty", items: [] }), ...overrides };
}

it("groups previews without citeable evidence and discloses contextual reads", async () => {
  const problem = source("problem"); const approach = source("approach");
  let readInput: ReadInput | undefined;
  const knowledge = createRunKnowledge(store({
    search: async () => ({ kind: "success", items: [problem, approach] }),
    read: async (input) => { readInput = input; return { kind: "success", items: [problem, approach] }; },
  }), runId);
  const search = await knowledge.searchCases("release");
  expect(search.kind).toBe("success");
  if (search.kind !== "success") throw new Error("Expected results");
  expect(search.items).toHaveLength(1);
  expect(search.items[0]?.sections.map((section) => section.sectionKey)).toEqual(["problem", "approach"]);
  expect(JSON.stringify(search)).not.toContain(problem.evidenceId);
  expect(knowledge.disclosed()).toEqual([]);
  const read = await knowledge.readCase(caseId, ["approach"]);
  expect(readInput?.revisionId).toBe(revisionId);
  expect(readInput?.sectionKeys).toContain("problem");
  expect(readInput?.sectionKeys).toContain("observedOutcome");
  expect(read.kind).toBe("success");
  if (read.kind !== "success") throw new Error("Expected read");
  expect(read.items[0]).toMatchObject({ marker: `[S:${runId}:1]`, text: problem.excerpt, outcome: "not_achieved" });
  expect(JSON.stringify(read)).not.toContain(problem.evidenceId);
  expect(knowledge.disclosed()[0]?.evidence).toEqual(problem);
  const repeated = await knowledge.readCase(caseId, ["approach"]);
  expect(repeated).toEqual({ kind: "no_progress", alreadyRead: [`[S:${runId}:1]`, `[S:${runId}:2]`] });
});

it("keeps the first revision and reports omitted conflicting sections", async () => {
  const first = source("problem");
  const changed = source("approach", { revisionId: "44444444-4444-4444-8444-444444444444" });
  const knowledge = createRunKnowledge(store({ search: async () => ({ kind: "success", items: [first, changed] }), read: async () => ({ kind: "success", items: [changed] }) }), runId);
  const search = await knowledge.searchCases("release");
  expect(search).toMatchObject({ kind: "partial", reason: "PINNED_REVISION_CONFLICT", items: [{ revisionId }] });
  expect(await knowledge.readCase(caseId, [])).toEqual({ kind: "partial", items: [], reason: "PINNED_REVISION_CONFLICT" });
  expect(knowledge.disclosed()).toEqual([]);
});

it("keeps empty search, upstream failure and omitted content distinct", async () => {
  const knowledge = createRunKnowledge(store({ read: async () => ({ kind: "error", code: "UNAVAILABLE", retryable: true }) }), runId);
  expect(await knowledge.searchCases("nothing")).toEqual({ kind: "empty", items: [] });
  expect(await knowledge.readCase(caseId, [])).toEqual({ kind: "error", code: "UNAVAILABLE", retryable: true });
  const huge = source("context", { excerpt: "漢".repeat(12000) });
  const limited = createRunKnowledge(store({ read: async () => ({ kind: "success", items: [huge] }) }), runId);
  expect(await limited.readCase(caseId, [])).toEqual({ kind: "partial", items: [], reason: "CONTEXT_LIMIT" });
  expect(limited.disclosed()).toEqual([]);
  const candidate = source("problem");
  const unavailable = createRunKnowledge(store({ search: async () => ({ kind: "success", items: [candidate] }) }), runId);
  await unavailable.searchCases("release");
  expect(await unavailable.readCase(caseId, [])).toEqual({ kind: "partial", items: [], reason: "SOURCE_UNAVAILABLE" });
});

it("delivers core sections of three short cases and reports omitted sections", async () => {
  const keys = ["problem", "context", "constraints", "approach", "observedOutcome", "lessons", "deliverable", "changeScope", "deploymentConditions"] as const;
  const cases = Array.from({ length: 3 }, () => {
    const currentCase = crypto.randomUUID();
    const revision = crypto.randomUUID();
    return keys.map((sectionKey) => source("problem", { caseId: currentCase, revisionId: revision, sectionKey, excerpt: `${sectionKey} for ${currentCase}` }));
  });
  const knowledge = createRunKnowledge(store({ read: async ({ caseId: requested }) => ({ kind: "success", items: (cases.find((items) => items[0]?.caseId === requested) ?? []).slice().sort((a, b) => a.sectionKey.localeCompare(b.sectionKey)) }) }), runId);
  const first = cases[0]?.[0]?.caseId; const second = cases[1]?.[0]?.caseId; const third = cases[2]?.[0]?.caseId;
  if (!first || !second || !third) throw new Error("Missing synthetic cases");
  expect((await knowledge.readCase(first, [])).kind).toBe("success");
  expect((await knowledge.readCase(second, [])).kind).toBe("success");
  const last = await knowledge.readCase(third, []);
  expect(last).toMatchObject({ kind: "partial", reason: "CONTEXT_LIMIT" });
  if (last.kind !== "partial") throw new Error("Expected a partial result");
  expect(last.items.map((item) => item.sectionKey)).toEqual(["problem", "context", "constraints", "approach", "observedOutcome", "lessons"]);
  expect(new Set(knowledge.disclosed().map(({ evidence }) => evidence.caseId))).toEqual(new Set([first, second, third]));
  expect(knowledge.disclosed()).toHaveLength(24);
});
