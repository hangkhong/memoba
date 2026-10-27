import { expect, it } from "vitest";
import { createEvidenceRegistry } from "@/modules/knowledge/context";
import { evidenceSchema } from "@/modules/knowledge/contracts";
import { validateBrief } from "./validation";
const evidence = evidenceSchema.parse({ evidenceId: "known", caseId: "30000000-0000-4000-8000-000000000001", revisionId: "40000000-0000-4000-8000-000000000001", sectionId: "50000000-0000-4000-8000-000000000001", sectionKey: "approach", caseTitle: "Case", excerpt: "Used a flag", outcome: "unknown", authorId: "10000000-0000-4000-8000-000000000001", recordedAt: "2026-10-27T00:00:00.000Z", sources: [], purpose: "method", retrievalReason: "Hybrid" });
const reference = { evidenceId: "known", caseId: evidence.caseId, revisionId: evidence.revisionId, sectionKey: "approach" };
const draft = { reusableApproach: [{ kind: "observed", text: "The team used a flag.", references: [reference] }], adjustments: [], conflicts: [], unknowns: ["Adoption remains unknown."], nextSteps: [{ kind: "proposal", text: "Validate rollout conditions.", references: [] }] };
it("rejects an invented citation and a changed revision", async () => {
  const registry = createEvidenceRegistry(); registry.register(evidence);
  const invented = await validateBrief({ draft: { ...draft, reusableApproach: [{ kind: "observed", text: "Claim", references: [{ ...reference, evidenceId: "invented" }] }] }, evidenceRegistry: registry, canRead: async () => true });
  expect(invented.kind).toBe("invalid");
  const changed = await validateBrief({ draft: { ...draft, reusableApproach: [{ kind: "observed", text: "Claim", references: [{ ...reference, revisionId: "40000000-0000-4000-8000-000000000002" }] }] }, evidenceRegistry: registry, canRead: async () => true });
  expect(changed.kind).toBe("invalid");
});
it("requires references for observed claims and checks current access", async () => {
  const registry = createEvidenceRegistry(); registry.register(evidence);
  expect((await validateBrief({ draft: { ...draft, reusableApproach: [{ kind: "observed", text: "Claim", references: [] }] }, evidenceRegistry: registry, canRead: async () => true })).kind).toBe("invalid");
  expect((await validateBrief({ draft, evidenceRegistry: registry, canRead: async () => false })).kind).toBe("invalid");
  expect((await validateBrief({ draft, evidenceRegistry: registry, canRead: async () => true })).kind).toBe("valid");
});
