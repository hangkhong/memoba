import { executionLimits } from "@/lib/contracts/limits";
import { purposeSchema } from "@/modules/analysis/schema";
import type { EvidenceBundle, EvidenceItem } from "./contracts";

const pairKey = (item: EvidenceItem) => `${item.revisionId}:${item.sectionKey}`;
export const estimateEvidenceTokens = (items: EvidenceItem[]) => Math.ceil(new TextEncoder().encode(JSON.stringify(items)).byteLength / 3);

// Registration tracks identity and budgets. Repositories must check current access
// and active/published state before calling it. It is not an authorization check.
export function createEvidenceRegistry() {
  const byId = new Map<string, EvidenceItem>();
  const pairs = new Map<string, EvidenceItem>();
  const revisions = new Map<EvidenceItem["caseId"], EvidenceItem["revisionId"]>();
  return {
    register(item: EvidenceItem) {
      const pinned = revisions.get(item.caseId);
      if (pinned && pinned !== item.revisionId) return { kind: "revision_conflict" } as const;
      const existingId = byId.get(item.evidenceId);
      if (existingId && pairKey(existingId) !== pairKey(item)) return { kind: "identity_conflict" } as const;
      const existing = pairs.get(pairKey(item));
      if (existing) return { kind: "duplicate", item: existing } as const;
      if (pairs.size >= executionLimits.candidateSections) return { kind: "limit" } as const;
      revisions.set(item.caseId, item.revisionId);
      pairs.set(pairKey(item), item);
      byId.set(item.evidenceId, item);
      return { kind: "registered", item } as const;
    },
    find: (id: string) => byId.get(id),
    items: () => [...pairs.values()],
  };
}
export type EvidenceRegistry = ReturnType<typeof createEvidenceRegistry>;

export function buildEvidenceBundle({ items }: { items: EvidenceItem[] }): EvidenceBundle {
  const registry = createEvidenceRegistry();
  const warnings = new Set<EvidenceBundle["warnings"][number]>();
  for (const item of items) {
    const registration = registry.register(item);
    if (registration.kind === "revision_conflict" || registration.kind === "identity_conflict") warnings.add("PINNED_REVISION_CONFLICT");
    if (registration.kind === "limit") warnings.add("CONTEXT_LIMIT");
  }
  const candidates = registry.items();
  const preferred = [
    ...purposeSchema.options.flatMap((purpose) => {
      const first = candidates.find((item) => item.purpose === purpose);
      return first ? [first] : [];
    }),
    ...candidates.filter((item) => item.outcome === "not_achieved").slice(0, 1),
    ...candidates,
  ];
  const selected: EvidenceItem[] = [];
  const seen = new Set<string>();
  for (const item of preferred) {
    if (seen.has(pairKey(item))) continue;
    seen.add(pairKey(item));
    if (selected.length >= executionLimits.contextSections || estimateEvidenceTokens([...selected, item]) > executionLimits.contextTokens) {
      warnings.add("CONTEXT_LIMIT"); continue;
    }
    selected.push(item);
  }
  return {
    items: selected,
    gaps: purposeSchema.options.filter((purpose) => !selected.some((item) => item.purpose === purpose)),
    warnings: [...warnings],
    estimatedTokens: estimateEvidenceTokens(selected),
  };
}
