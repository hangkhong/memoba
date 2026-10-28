import type { EvidenceRegistry } from "@/modules/knowledge/context";
import type { EvidenceItem } from "@/modules/knowledge/contracts";
import { draftBriefSchema } from "./schema";

export async function validateBrief({ draft, evidenceRegistry, canRead }: {
  draft: unknown;
  evidenceRegistry: EvidenceRegistry;
  canRead: (item: EvidenceItem) => Promise<boolean>;
}) {
  const parsed = draftBriefSchema.safeParse(draft);
  if (!parsed.success) return { kind: "invalid", code: "INVALID_SCHEMA" } as const;
  const claims = [...parsed.data.reusableApproach, ...parsed.data.adjustments, ...parsed.data.conflicts, ...parsed.data.nextSteps];
  const verified = new Set<string>();
  for (const claim of claims) {
    for (const reference of claim.references) {
      const evidence = evidenceRegistry.find(reference.evidenceId);
      if (!evidence || evidence.caseId !== reference.caseId || evidence.revisionId !== reference.revisionId || evidence.sectionKey !== reference.sectionKey) {
        return { kind: "invalid", code: "INVALID_CITATION" } as const;
      }
      if (verified.has(reference.evidenceId)) continue;
      try {
        if (!await canRead(evidence)) return { kind: "invalid", code: "SOURCE_ACCESS_DENIED" } as const;
      } catch { return { kind: "invalid", code: "SOURCE_ACCESS_UNAVAILABLE" } as const; }
      verified.add(reference.evidenceId);
    }
  }
  // Provenance validation does not establish semantic support for a claim.
  return { kind: "valid", value: parsed.data } as const;
}
