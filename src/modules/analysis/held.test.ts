import { expect, it } from "vitest";
import { caseEvidenceSchema, type HeldSource } from "@/modules/knowledge/contracts";
import { executionLimits } from "@/lib/contracts/limits";
import { citableHeld, heldEvidenceBlock } from "./held";

const evidence = (title: string, excerpt = "A pilot ran.") => caseEvidenceSchema.parse({ evidenceId: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionId: crypto.randomUUID(), sectionId: crypto.randomUUID(), sectionKey: "approach", caseTitle: title, excerpt, outcome: "achieved", authorId: crypto.randomUUID(), recordedAt: new Date().toISOString(), sources: [], purpose: "method", retrievalReason: "fixture" });
const held = (standing: HeldSource["standing"], title: string, n: number): HeldSource => ({ marker: `[S:11111111-1111-4111-8111-111111111111:${n}]`, evidence: evidence(title), standing });

it("shows nothing when the conversation holds nothing", () => { expect(heldEvidenceBlock([])).toBeUndefined(); });
it("tells the agent, from code, which held sources changed and must be read again", () => {
  const block = heldEvidenceBlock([held("current", "Pilot", 1), held("changed", "Export retry", 2)]) ?? "";
  expect(block).toContain("CHANGED: Export retry");
  expect(block).toContain("[S:11111111-1111-4111-8111-111111111111:2]");
  expect(block).toContain("Read it again");
  expect(block).not.toContain("ARCHIVED");
});
it("marks archived sources as historical and shortens excerpts", () => {
  const long = { ...held("archived", "Old", 1), evidence: evidence("Old", "x".repeat(executionLimits.ledgerExcerptChars + 50)) };
  const block = heldEvidenceBlock([long]) ?? "";
  expect(block).toContain("ARCHIVED sources are historical");
  expect(block).toContain('"truncated":true');
  expect(block).not.toContain("x".repeat(executionLimits.ledgerExcerptChars + 1));
});
it("lets current and archived sources be cited and never a changed one", () => {
  const all = [held("current", "A", 1), held("changed", "B", 2), held("archived", "C", 3)];
  expect(citableHeld(all).map((source) => source.marker)).toEqual([all[0]?.marker, all[2]?.marker]);
});
