import { expect, it } from "vitest";
import { evidenceSchema } from "@/modules/knowledge/contracts";
import { documentTagLabel, groupEvidenceSources } from "./evidence-sources";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const caseItem = (n: number, caseN: number, sectionKey: string) => evidenceSchema.parse({ evidenceId: `c${n}`, caseId: id(caseN), revisionId: id(90), sectionId: id(n), sectionKey, caseTitle: `Case ${caseN}`, excerpt: "x", outcome: "achieved", authorId: id(99), recordedAt: "2026-10-29T12:00:00Z", sources: [], purpose: "method", retrievalReason: "r" });
const docItem = (n: number, docN: number, heading: string) => evidenceSchema.parse({ source: "document", evidenceId: `d${n}`, documentId: id(docN), revisionId: id(91), sectionId: id(n), version: 1, block: 1, heading, documentTitle: `Doc ${docN}`, type: "policy", area: "Legal", owner: "Ops", effectiveFrom: "2026-01-01", excerpt: "x", authorId: id(99), recordedAt: "2026-10-29T12:00:00Z", sources: [] });

it("groups sections under their case or document and keeps the two kinds apart", () => {
  const groups = groupEvidenceSources([caseItem(1, 1, "lessons"), docItem(2, 1, "Notice > How notice is sent"), caseItem(3, 1, "context"), docItem(4, 2, "Refunds")]);
  expect(groups.map((group) => [group.kind, group.title, group.tags.map((tag) => tag.label)])).toEqual([
    ["case", "Case 1", ["Lessons and applicability", "Context"]],
    ["document", "Doc 1", ["How notice is sent"]],
    ["document", "Doc 2", ["Refunds"]],
  ]);
});
it("numbers only the tags whose labels collide, and drops repeated evidence", () => {
  const groups = groupEvidenceSources([docItem(1, 1, "Notice"), docItem(2, 1, "Steps > Notice"), docItem(3, 1, "Scope"), docItem(1, 1, "Notice")]);
  expect(groups).toHaveLength(1);
  expect(groups[0]?.tags.map((tag) => tag.label)).toEqual(["Notice 1", "Notice 2", "Scope"]);
});
it("takes the last step of a heading path", () => { expect(documentTagLabel("A > B > C")).toBe("C"); expect(documentTagLabel("Plain")).toBe("Plain"); });
