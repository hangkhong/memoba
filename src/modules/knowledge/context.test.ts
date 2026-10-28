import { expect, it } from "vitest";
import { evidenceSchema } from "./contracts";
import { buildEvidenceBundle, createEvidenceRegistry } from "./context";
function item(index = 0, excerpt = "Flag rollout reduced release risk.") {
  return evidenceSchema.parse({ evidenceId: `e-${index}`, caseId: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`, revisionId: `40000000-0000-4000-8000-${String(index).padStart(12, "0")}`, sectionId: `50000000-0000-4000-8000-${String(index).padStart(12, "0")}`, sectionKey: "approach", caseTitle: "Checkout", excerpt, outcome: index === 18 ? "not_achieved" : "unknown", authorId: "10000000-0000-4000-8000-000000000001", recordedAt: "2026-10-27T00:00:00.000Z", sources: [], purpose: "method", retrievalReason: "Hybrid search" });
}
it("deduplicates revision/section pairs and reserves space for a failed precedent", () => {
  const items = Array.from({ length: 20 }, (_, index) => item(index));
  const bundle = buildEvidenceBundle({ items: [item(0), ...items] });
  expect(bundle.items).toHaveLength(12);
  expect(new Set(bundle.items.map((value) => `${value.revisionId}:${value.sectionKey}`)).size).toBe(12);
  expect(bundle.items.some((value) => value.outcome === "not_achieved")).toBe(true);
  expect(bundle.gaps).toEqual(["conditions", "exceptions"]);
});
it("keeps serialized evidence within the token estimate", () => {
  const bundle = buildEvidenceBundle({ items: Array.from({ length: 20 }, (_, index) => item(index, "漢".repeat(4000))) });
  expect(bundle.estimatedTokens).toBeLessThanOrEqual(8000);
  expect(bundle.warnings).toContain("CONTEXT_LIMIT");
});
it("caps the run registry at 40 candidates and pins one revision for each case", () => {
  const registry = createEvidenceRegistry();
  for (let index = 0; index < 40; index++) expect(registry.register(item(index)).kind).toBe("registered");
  expect(registry.register(item(40)).kind).toBe("limit");
  const original = item(0);
  expect(registry.register(evidenceSchema.parse({ ...original, evidenceId: "new", revisionId: "40000000-0000-4000-8000-000000000099" })).kind).toBe("revision_conflict");
  expect(registry.find("e-0")?.revisionId).toBe(original.revisionId);
  expect(registry.find("invented")).toBeUndefined();
});
