import { asSchema } from "ai";
import { expect, it } from "vitest";
import { claimSchema, draftBriefSchema, storedAnswerSchema } from "./schema";

it("serializes disjoint claim kinds with anyOf while preserving observed evidence requirements", async () => {
  const serialized = JSON.stringify(await asSchema(draftBriefSchema).jsonSchema);
  expect(serialized).toContain('"anyOf"');
  expect(serialized).not.toContain('"oneOf"');
  expect(claimSchema.safeParse({ kind: "observed", text: "Unsupported fact", references: [] }).success).toBe(false);
  expect(claimSchema.safeParse({ kind: "proposal", text: "Review applicability", references: [] }).success).toBe(true);
});
it("reads saved legacy briefs and versioned text answers", () => {
  const legacy = { reusableApproach: [{ kind: "proposal", text: "Try a canary", references: [] }], adjustments: [], conflicts: [], unknowns: [], nextSteps: [{ kind: "proposal", text: "Review", references: [] }] };
  const answer = { version: 2, text: "Try a canary [S:00000000-0000-4000-8000-000000000001:1]", citations: [{ marker: "[S:00000000-0000-4000-8000-000000000001:1]", evidenceId: "00000000-0000-4000-8000-000000000002" }] };
  expect(storedAnswerSchema.parse(legacy)).toEqual(legacy);
  expect(storedAnswerSchema.parse(answer)).toEqual(answer);
  expect(storedAnswerSchema.safeParse({ ...answer, citations: [{ ...answer.citations[0], marker: "[S1]" }] }).success).toBe(false);
});

it("reads saved answers made before documents existed", async () => {
  const { storedBriefRecordSchema } = await import("./repository");
  const caseEvidence = { evidenceId: "00000000-0000-4000-8000-000000000002", caseId: "00000000-0000-4000-8000-000000000003", revisionId: "00000000-0000-4000-8000-000000000004", sectionId: "00000000-0000-4000-8000-000000000002", sectionKey: "approach", caseTitle: "Canary", excerpt: "A canary was used.", outcome: "achieved", authorId: "00000000-0000-4000-8000-000000000005", recordedAt: "2026-10-29T00:00:00Z", sources: [], purpose: "method", retrievalReason: "read pinned case section" };
  const old = { id: crypto.randomUUID(), run_id: crypto.randomUUID(), generated: { version: 2, text: "Canary [S:00000000-0000-4000-8000-000000000001:1]", citations: [{ marker: "[S:00000000-0000-4000-8000-000000000001:1]", evidenceId: caseEvidence.evidenceId }], coverage: { searched: true, previewed: 3, read: 1, searchFailed: false, unreadTitles: [] } }, evidence: [caseEvidence], hard_constraints: [], edited_text: null, edited_at: null, saved: false, created_at: "2026-10-29T00:00:00Z" };
  const parsed = storedBriefRecordSchema.parse(old);
  expect(parsed.evidence[0]).toEqual(caseEvidence);
  expect("source" in (parsed.evidence[0] ?? {})).toBe(false);
});
