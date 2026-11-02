import { expect, it } from "vitest";
import { executionLimits, inputLimits } from "@/lib/contracts/limits";
import { caseEvidenceSchema, type EvidenceItem } from "@/modules/knowledge/contracts";
import { holdSources, type KnowledgeStore } from "@/modules/knowledge/service";
import { boundHistory, historyForConversation } from "./service";
import { earlierSources } from "./ledger";
import type { ConversationDetail } from "./view-schema";

const at = "2026-01-01T00:00:00Z";
const request = { version: 2 as const, message: "q", history: [] };
const evidence = (title: string): EvidenceItem => caseEvidenceSchema.parse({ evidenceId: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionId: crypto.randomUUID(), sectionId: crypto.randomUUID(), sectionKey: "approach", caseTitle: title, excerpt: `${title} text`, outcome: "achieved", authorId: crypto.randomUUID(), recordedAt: at, sources: [], purpose: "method", retrievalReason: "fixture" });
function turn(position: number, message: string, answer?: { text: string; sources: { marker: string; evidence: EvidenceItem }[]; status?: string }) {
  const runId = crypto.randomUUID();
  return { id: crypto.randomUUID(), conversation_id: crypto.randomUUID(), position, parent_turn_id: null, message, request, created_at: at, runs: answer ? [{
    id: runId, request, status: answer.status ?? "complete", events: [], created_at: at, deadline_at: at, finished_at: at, error_code: null, usage: null, briefId: crypto.randomUUID(),
    brief: { id: crypto.randomUUID(), run_id: runId, generated: { version: 2 as const, text: answer.text, citations: answer.sources.map(({ marker, evidence: item }) => ({ marker, evidenceId: item.evidenceId })) }, evidence: answer.sources.map((source) => source.evidence), hard_constraints: [], edited_text: null, edited_at: null, saved: false, created_at: at },
  }] : [] } as ConversationDetail["turns"][number];
}
const marker = (n: number) => `[S:11111111-1111-4111-8111-11111111111${n}:1]`;

it("holds the sources earlier completed answers cited, newest first, without duplicates", () => {
  const a = evidence("A"); const b = evidence("B");
  const turns = [turn(1, "q1", { text: "A", sources: [{ marker: marker(1), evidence: a }] }), turn(2, "q2", { text: "B", sources: [{ marker: marker(2), evidence: b }, { marker: marker(1), evidence: a }] }), turn(3, "q3")];
  expect(earlierSources(turns).map((source) => source.marker)).toEqual([marker(2), marker(1)]);
});
it("ignores a failed answer and a legacy brief, which have no markers", () => {
  const a = evidence("A");
  expect(earlierSources([turn(1, "q", { text: "x", status: "failed", sources: [{ marker: marker(1), evidence: a }] })])).toEqual([]);
});
it("caps what a long conversation holds", () => {
  const many = Array.from({ length: executionLimits.ledgerSources + 5 }, (_, index) => ({ marker: `[S:11111111-1111-4111-8111-111111111111:${index + 1}]`, evidence: evidence(`C${index}`) }));
  expect(earlierSources([turn(1, "q", { text: "x", sources: many })])).toHaveLength(executionLimits.ledgerSources);
});
it("judges standing in code and holds a source as changed when it cannot be checked", async () => {
  const current = evidence("Current"); const changed = evidence("Changed"); const archived = evidence("Archived"); const gone = evidence("Gone");
  const sources = [current, changed, archived, gone].map((item, index) => ({ marker: marker(index + 1), evidence: item }));
  const store = { standing: async () => new Map([[current.evidenceId, "current" as const], [changed.evidenceId, "changed" as const], [archived.evidenceId, "archived" as const]]) } as unknown as KnowledgeStore;
  expect((await holdSources(store, sources)).map((source) => source.standing)).toEqual(["current", "changed", "archived"]);
  const failing = { standing: async () => { throw new Error("down"); } } as unknown as KnowledgeStore;
  expect((await holdSources(failing, sources)).map((source) => source.standing)).toEqual(["changed", "changed", "changed", "changed"]);
});

it("does not lock a conversation after six exchanges or an answer above 4,000 characters", () => {
  const turns = Array.from({ length: 10 }, (_, index) => turn(index + 1, `Question ${index + 1}`, { text: `Answer ${index + 1} ` + "x".repeat(index === 9 ? 9_000 : 100), sources: [] }));
  const history = historyForConversation(turns);
  expect(history.length).toBeLessThanOrEqual(inputLimits.conversationMessages);
  expect(history.at(-1)?.text.length).toBeGreaterThan(inputLimits.text);
  expect(history.filter((message) => message.role === "user").map((message) => message.text)).toEqual(Array.from({ length: 10 }, (_, index) => `Question ${index + 1}`));
});
it("drops the oldest answers before any message the user wrote", () => {
  const messages = Array.from({ length: 16 }, (_, index) => ({ role: index % 2 === 0 ? "user" as const : "assistant" as const, text: index % 2 === 0 ? `Never use vendor ${index}` : "answer" }));
  const bounded = boundHistory(messages);
  expect(bounded.length).toBeLessThanOrEqual(inputLimits.conversationMessages);
  expect(bounded.filter((message) => message.role === "user")).toHaveLength(8);
  expect(bounded.at(-1)?.role).toBe("assistant");
});
it("falls back to dropping the oldest user messages only when answers cannot make room", () => {
  const messages = Array.from({ length: 30 }, (_, index) => ({ role: "user" as const, text: `Restriction ${index}` }));
  const bounded = boundHistory(messages);
  expect(bounded).toHaveLength(inputLimits.conversationMessages);
  expect(bounded.at(-1)?.text).toBe("Restriction 29");
});
it("bounds history by characters as well as by count", () => {
  const messages = [{ role: "user" as const, text: "No downtime" }, ...Array.from({ length: 4 }, () => [{ role: "assistant" as const, text: "y".repeat(inputLimits.historyAnswer) }, { role: "user" as const, text: "go on" }]).flat()];
  const bounded = boundHistory(messages);
  expect(bounded.reduce((sum, message) => sum + message.text.length, 0)).toBeLessThanOrEqual(inputLimits.historyChars);
  expect(bounded[0]?.text).toBe("No downtime");
});
