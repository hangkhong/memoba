import { expect, it } from "vitest";
import { caseEvidenceSchema, documentEvidenceSchema, type EvidenceItem } from "@/modules/knowledge/contracts";
import { citationPlacement, stripSectionTags, validateTextAnswer } from "./validation";

const run = "11111111-1111-4111-8111-111111111111";
const caseItem = caseEvidenceSchema.parse({ evidenceId: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionId: crypto.randomUUID(), sectionId: crypto.randomUUID(), sectionKey: "approach", caseTitle: "Pilot", excerpt: "A pilot ran.", outcome: "achieved", authorId: crypto.randomUUID(), recordedAt: new Date().toISOString(), sources: [], purpose: "method", retrievalReason: "fixture" });
const documentItem = documentEvidenceSchema.parse({ source: "document", evidenceId: crypto.randomUUID(), documentId: crypto.randomUUID(), revisionId: crypto.randomUUID(), sectionId: crypto.randomUUID(), version: 1, block: 1, heading: "Notice", documentTitle: "Price policy", type: "policy", area: "Finance", owner: "Finance", effectiveFrom: "2026-01-01", excerpt: "Give notice.", authorId: crypto.randomUUID(), recordedAt: new Date().toISOString(), sources: [] });
const doc = `[S:${run}:1]`; const kase = `[S:${run}:2]`;
const sources = new Map<string, EvidenceItem>([[doc, documentItem], [kase, caseItem]]);

it("keeps enforcing separation under English headings", () => {
  expect(citationPlacement(`## What the process says\n- Notice ${doc}\n## How similar cases went\n- Pilot ${kase}`, sources)).toBe(true);
  expect(citationPlacement(`## What the process says\n- Pilot ${kase}`, sources)).toBe(false);
  expect(citationPlacement(`## How similar cases went\n- Notice ${doc}`, sources)).toBe(false);
});
it("enforces the same separation under translated headings that carry the section tag", () => {
  expect(citationPlacement(`## Quy trình nói gì {#process}\n- Cần báo trước ${doc}\n## Các ca tương tự diễn ra thế nào {#cases}\n- Thí điểm ${kase}`, sources)).toBe(true);
  expect(citationPlacement(`## Quy trình nói gì {#process}\n- Thí điểm ${kase}`, sources)).toBe(false);
  expect(citationPlacement(`## Các ca tương tự diễn ra thế nào {#cases}\n- Cần báo trước ${doc}`, sources)).toBe(false);
});
it("does not let a subheading or an untagged heading escape its section", () => {
  expect(citationPlacement(`## What the process says\n### Steps\n- Pilot ${kase}`, sources)).toBe(false);
  expect(citationPlacement(`## What the process says\n- Notice ${doc}\n## Bước tiếp theo\n- Pilot ${kase}`, sources)).toBe(true);
});
it("removes the section tags from the saved answer and keeps the prose", () => {
  expect(stripSectionTags("## Quy trình nói gì {#process}\nGiữ nguyên {#process} trong văn bản.")).toBe("## Quy trình nói gì\nGiữ nguyên {#process} trong văn bản.");
});
it("validates a translated answer against tagged headings and saves it without the tags", async () => {
  const text = `Cần báo trước ${doc}.\n\n## Quy trình nói gì {#process}\n- Thông báo ${doc}`;
  const result = await validateTextAnswer({ text, disclosed: [{ marker: doc, evidence: documentItem }], canRead: async () => true });
  expect(result.kind).toBe("valid");
  if (result.kind === "valid") expect(result.value.text).not.toContain("{#process}");
  const misplaced = await validateTextAnswer({ text: `## Quy trình nói gì {#process}\n- Thí điểm ${kase}`, disclosed: [{ marker: kase, evidence: caseItem }], canRead: async () => true });
  expect(misplaced).toEqual({ kind: "invalid", code: "MISPLACED_CITATION" });
});
it("takes a marker from the conversation's held evidence and still checks access for it", async () => {
  const held = [{ marker: doc, evidence: documentItem }];
  expect((await validateTextAnswer({ text: `Notice ${doc}`, disclosed: [], held, canRead: async () => true })).kind).toBe("valid");
  expect(await validateTextAnswer({ text: `Notice ${doc}`, disclosed: [], held, canRead: async () => false })).toEqual({ kind: "invalid", code: "SOURCE_ACCESS_DENIED" });
  expect(await validateTextAnswer({ text: `Notice ${doc}`, disclosed: [], held: [], canRead: async () => true })).toEqual({ kind: "invalid", code: "INVALID_CITATION" });
});
it("rejects a citation in look-alike brackets instead of saving it as plain prose", async () => {
  const result = await validateTextAnswer({ text: `Notice 【S:${run}:1】`, disclosed: [{ marker: doc, evidence: documentItem }], canRead: async () => true });
  expect(result).toEqual({ kind: "invalid", code: "INVALID_CITATION" });
});
it("saves one marker per source when a held marker and a fresh read name the same source", async () => {
  const held = `[S:${run}:7]`; const fresh = `[S:22222222-2222-4222-8222-222222222222:1]`;
  const result = await validateTextAnswer({ text: `Notice ${held} and again ${fresh}, then ${held}.`, disclosed: [{ marker: fresh, evidence: documentItem }], held: [{ marker: held, evidence: documentItem }], canRead: async () => true });
  expect(result.kind).toBe("valid");
  if (result.kind === "valid") {
    expect(result.value.citations).toEqual([{ marker: fresh, evidenceId: documentItem.evidenceId }]);
    expect(result.value.text).toBe(`Notice ${fresh} and again ${fresh}, then ${fresh}.`);
    expect(result.snapshots).toEqual([documentItem]);
  }
});
