import { expect, it } from "vitest";
import { answerCoverage, createRunKnowledge, type KnowledgeStore, type ReadInput } from "./service";
import { evidenceSchema } from "./contracts";
import type { SectionKey } from "@/modules/cases/schema";

const runId = "11111111-1111-4111-8111-111111111111";
const caseId = "22222222-2222-4222-8222-222222222222";
const revisionId = "33333333-3333-4333-8333-333333333333";
function source(sectionKey: SectionKey, extra: Record<string, unknown> = {}) {
  const sectionId = crypto.randomUUID();
  return evidenceSchema.parse({ evidenceId: sectionId, caseId, revisionId, sectionId, sectionKey, caseTitle: "Rollout", excerpt: `${sectionKey} evidence`, outcome: "not_achieved", authorId: crypto.randomUUID(), recordedAt: "2026-10-29T00:00:00Z", sources: [], purpose: "method", retrievalReason: "search", ...extra });
}
function store(overrides: Partial<KnowledgeStore>): KnowledgeStore {
  return { search: async () => ({ kind: "empty", items: [] }), read: async () => ({ kind: "empty", items: [] }), expand: async () => ({ kind: "empty", items: [] }), ...overrides };
}
function caseWith(keys: SectionKey[], extra: Record<string, unknown> = {}) {
  const id = crypto.randomUUID(); const revision = crypto.randomUUID();
  return { id, items: keys.map((sectionKey) => source(sectionKey, { caseId: id, revisionId: revision, caseTitle: `Case ${id.slice(0, 4)}`, excerpt: `${sectionKey} for ${id}`, ...extra })) };
}
function readsFrom(cases: ReturnType<typeof caseWith>[]): Pick<KnowledgeStore, "read"> {
  return { read: async ({ caseId: requested, sectionKeys }) => {
    const items = (cases.find((item) => item.id === requested)?.items ?? []).filter((item) => !sectionKeys.length || sectionKeys.includes(item.sectionKey));
    return items.length ? { kind: "success", items } : { kind: "empty", items: [] };
  } };
}

it("groups previews without citeable evidence and discloses requested reads", async () => {
  const problem = source("problem"); const approach = source("approach"); const outcome = source("observedOutcome");
  let readInput: ReadInput | undefined;
  const knowledge = createRunKnowledge(store({
    search: async () => ({ kind: "success", items: [problem, approach] }),
    read: async (input) => { readInput = input; return { kind: "success", items: [outcome, approach] }; },
  }), runId);
  const search = await knowledge.searchCases("release");
  expect(search.kind).toBe("success");
  if (search.kind !== "success") throw new Error("Expected results");
  expect(search.items).toHaveLength(1);
  expect(search.items[0]?.sections.map((section) => section.sectionKey)).toEqual(["problem", "approach"]);
  expect(JSON.stringify(search)).not.toContain(problem.evidenceId);
  expect(knowledge.disclosed()).toEqual([]);
  const read = await knowledge.readCases([caseId], ["approach"]);
  expect(readInput?.revisionId).toBe(revisionId);
  expect(readInput?.sectionKeys.slice().sort()).toEqual(["approach", "observedOutcome"]);
  expect(read.kind).toBe("success");
  if (read.kind !== "success") throw new Error("Expected read");
  expect(read.cases).toEqual([{ caseId, revisionId, title: "Rollout", outcome: "not_achieved", observedOutcome: { marker: `[S:${runId}:1]`, text: outcome.excerpt } }]);
  expect(read.items).toEqual([expect.objectContaining({ marker: `[S:${runId}:2]`, sectionKey: "approach", text: approach.excerpt })]);
  expect(JSON.stringify(read)).not.toContain(approach.evidenceId);
  expect(knowledge.disclosed().map(({ evidence }) => evidence.sectionKey)).toEqual(["observedOutcome", "approach"]);
  expect(await knowledge.readCases([caseId], ["approach"])).toEqual({ kind: "no_progress", alreadyRead: [`[S:${runId}:1]`, `[S:${runId}:2]`] });
});

it("does not merge unrequested sections into a read", async () => {
  const requested: SectionKey[][] = [];
  const knowledge = createRunKnowledge(store({ read: async ({ sectionKeys }) => { requested.push(sectionKeys); return { kind: "empty", items: [] }; } }), runId);
  await knowledge.readCases([caseId], ["lessons"]);
  expect(requested[0]?.slice().sort()).toEqual(["lessons", "observedOutcome"]);
});

it("returns a header per case and orders requested sections by priority", async () => {
  const keys: SectionKey[] = ["lessons", "constraints", "context", "problem", "observedOutcome", "approach", "deliverable"];
  const first = caseWith(keys); const second = caseWith(keys);
  const knowledge = createRunKnowledge(store(readsFrom([first, second])), runId);
  const result = await knowledge.readCases([first.id, second.id], keys);
  if (result.kind !== "success") throw new Error("Expected read");
  expect(result.cases.map((item) => item.caseId)).toEqual([first.id, second.id]);
  expect(result.cases.map((item) => item.observedOutcome?.marker)).toEqual([`[S:${runId}:1]`, `[S:${runId}:2]`]);
  expect(result.items.map((item) => `${item.caseId === first.id ? "A" : "B"}:${item.sectionKey}`)).toEqual(["A:approach", "B:approach", "A:problem", "B:problem", "A:context", "B:context", "A:constraints", "B:constraints", "A:lessons", "B:lessons", "A:deliverable", "B:deliverable"]);
});

it("drops the lowest-priority sections first when context runs out", async () => {
  const keys: SectionKey[] = ["problem", "context", "approach", "observedOutcome", "lessons"];
  const item = caseWith(keys);
  const huge = item.items.map((section) => section.sectionKey === "context" ? { ...section, excerpt: "漢".repeat(60000) } : section);
  const knowledge = createRunKnowledge(store({ read: async () => ({ kind: "success", items: huge }) }), runId);
  const result = await knowledge.readCases([item.id], keys);
  expect(result).toMatchObject({ kind: "partial", reason: "CONTEXT_LIMIT" });
  if (result.kind !== "partial") throw new Error("Expected a partial result");
  expect(result.items.map((section) => section.sectionKey)).toEqual(["approach", "problem"]);
  expect(result.cases[0]?.observedOutcome?.marker).toBe(`[S:${runId}:1]`);
});

it("keeps the first revision per case and reports conflicting sections", async () => {
  const first = source("problem");
  const changed = source("approach", { revisionId: "44444444-4444-4444-8444-444444444444" });
  const knowledge = createRunKnowledge(store({ search: async () => ({ kind: "success", items: [first, changed] }), read: async () => ({ kind: "success", items: [changed] }) }), runId);
  const search = await knowledge.searchCases("release");
  expect(search).toMatchObject({ kind: "partial", reason: "PINNED_REVISION_CONFLICT", items: [{ revisionId }] });
  expect(await knowledge.readCases([caseId], [])).toEqual({ kind: "partial", items: [], cases: [], reason: "PINNED_REVISION_CONFLICT" });
  expect(knowledge.disclosed()).toEqual([]);
});

it("keeps empty search, upstream failure and omitted content distinct", async () => {
  const knowledge = createRunKnowledge(store({ read: async () => ({ kind: "error", code: "UNAVAILABLE", retryable: true }) }), runId);
  expect(await knowledge.searchCases("nothing")).toEqual({ kind: "empty", items: [] });
  expect(await knowledge.readCases([caseId], [])).toEqual({ kind: "error", code: "UNAVAILABLE", retryable: true });
  const huge = source("context", { excerpt: "漢".repeat(120000) });
  const limited = createRunKnowledge(store({ read: async () => ({ kind: "success", items: [huge] }) }), runId);
  expect(await limited.readCases([caseId], [])).toEqual({ kind: "partial", items: [], cases: [{ caseId, revisionId, title: "Rollout", outcome: "not_achieved" }], reason: "CONTEXT_LIMIT" });
  expect(limited.disclosed()).toEqual([]);
  const candidate = source("problem");
  const unavailable = createRunKnowledge(store({ search: async () => ({ kind: "success", items: [candidate] }) }), runId);
  await unavailable.searchCases("release");
  expect(await unavailable.readCases([caseId], [])).toEqual({ kind: "partial", items: [], cases: [], reason: "SOURCE_UNAVAILABLE" });
});

it("reads several cases in one call and reports an unavailable case without failing the others", async () => {
  const keys: SectionKey[] = ["problem", "approach", "observedOutcome"];
  const cases = [caseWith(keys), caseWith(keys)];
  const gone = crypto.randomUUID();
  const knowledge = createRunKnowledge(store(readsFrom(cases)), runId);
  const result = await knowledge.readCases([...cases.map((item) => item.id), gone], []);
  expect(result).toMatchObject({ kind: "partial", reason: "SOURCE_UNAVAILABLE" });
  if (result.kind !== "partial") throw new Error("Expected a partial result");
  expect(result.cases).toHaveLength(2);
  expect(new Set(knowledge.disclosed().map(({ evidence }) => evidence.caseId))).toEqual(new Set(cases.map((item) => item.id)));
});

it("adds the template to the case header when the store can supply it", async () => {
  const item = caseWith(["approach", "observedOutcome"]);
  const knowledge = createRunKnowledge(store({ ...readsFrom([item]), template: async () => "cs_operations" }), runId);
  const result = await knowledge.readCases([item.id], ["approach"]);
  if (result.kind !== "success") throw new Error("Expected read");
  expect(result.cases[0]).toMatchObject({ template: "cs_operations" });
});

function titled(sectionKey: SectionKey, id: string, title: string) { return source(sectionKey, { caseId: id, revisionId: crypto.randomUUID(), caseTitle: title }); }

it("tracks coverage from tool results, not model text", async () => {
  const none = createRunKnowledge(store({}), runId);
  expect(none.coverage()).toEqual({ searchState: "none", previewed: [], readCaseIds: [] });
  const a = crypto.randomUUID(); const b = crypto.randomUUID();
  const found = [titled("problem", a, "Case A"), titled("approach", a, "Case A"), titled("problem", b, "Case B")];
  const knowledge = createRunKnowledge(store({ search: async () => ({ kind: "success", items: found }) }), runId);
  await knowledge.searchCases("one");
  await knowledge.searchCases("two");
  expect(knowledge.coverage()).toEqual({ searchState: "succeeded", previewed: [{ caseId: a, title: "Case A" }, { caseId: b, title: "Case B" }], readCaseIds: [] });
});

it("counts a successful empty search as a search with nothing found", async () => {
  const knowledge = createRunKnowledge(store({ search: async () => ({ kind: "empty", items: [] }) }), runId);
  await knowledge.searchCases("nothing");
  expect(knowledge.coverage()).toEqual({ searchState: "succeeded", previewed: [], readCaseIds: [] });
});

it("marks a failed or partial search as incomplete and keeps it that way", async () => {
  const a = crypto.randomUUID();
  const ok = titled("problem", a, "Case A");
  let mode: "error" | "partial" | "success" = "error";
  const knowledge = createRunKnowledge(store({ search: async () => mode === "error" ? { kind: "error", code: "UNAVAILABLE", retryable: true } : mode === "partial" ? { kind: "partial", items: [ok], code: "CANDIDATE_LIMIT", retryable: false } : { kind: "success", items: [ok] } }), runId);
  await knowledge.searchCases("one");
  expect(knowledge.coverage().searchState).toBe("failed_or_partial");
  mode = "success"; await knowledge.searchCases("two");
  expect(knowledge.coverage().searchState).toBe("failed_or_partial");
  mode = "partial";
  const again = createRunKnowledge(store({ search: async () => ({ kind: "partial", items: [ok], code: "CANDIDATE_LIMIT", retryable: false }) }), runId);
  await again.searchCases("partial");
  expect(again.coverage()).toMatchObject({ searchState: "failed_or_partial", previewed: [{ caseId: a }] });
});

it("counts a case as read once and only when a section was disclosed", async () => {
  const keys: SectionKey[] = ["approach", "observedOutcome"];
  const item = caseWith(keys);
  const knowledge = createRunKnowledge(store(readsFrom([item])), runId);
  await knowledge.readCases([item.id], keys);
  await knowledge.readCases([item.id], keys);
  expect(knowledge.coverage().readCaseIds).toEqual([item.id]);
  const huge = source("context", { excerpt: "漢".repeat(120000) });
  const blocked = createRunKnowledge(store({ read: async () => ({ kind: "success", items: [huge] }) }), runId);
  await blocked.readCases([caseId], []);
  expect(blocked.coverage().readCaseIds).toEqual([]);
});

it("derives the saved coverage and caps unread titles", () => {
  const ids = Array.from({ length: 14 }, () => crypto.randomUUID());
  const previewed = ids.map((id, index) => ({ caseId: id, title: `Case ${index}` }));
  const saved = answerCoverage({ searchState: "succeeded", previewed, readCaseIds: [ids[0] ?? "", ids[1] ?? ""] });
  expect(saved).toMatchObject({ searched: true, previewed: 14, read: 2, searchFailed: false });
  expect(saved.unreadTitles).toHaveLength(10);
  expect(saved.unreadTitles[0]).toBe("Case 2");
  expect(answerCoverage({ searchState: "none", previewed: [], readCaseIds: [] })).toEqual({ searched: false, previewed: 0, read: 0, searchFailed: false, unreadTitles: [] });
  expect(answerCoverage({ searchState: "failed_or_partial", previewed: [], readCaseIds: [] })).toMatchObject({ searched: true, searchFailed: true });
});
