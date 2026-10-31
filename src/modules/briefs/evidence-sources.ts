import { isDocumentEvidence, type EvidenceItem } from "@/modules/knowledge/contracts";
import { sectionLabels } from "@/modules/cases/presentation";

export type SourceTag = { label: string; evidence: EvidenceItem };
export type SourceGroup = { key: string; kind: "case" | "document"; title: string; tags: SourceTag[] };

// A document heading can be a path such as "Notice > How notice is sent". The tag keeps the last step.
export const documentTagLabel = (heading: string) => heading.split(">").map((part) => part.trim()).filter(Boolean).at(-1) ?? heading;
const tagLabel = (item: EvidenceItem) => isDocumentEvidence(item) ? documentTagLabel(item.heading) : sectionLabels[item.sectionKey];

// One group per case or document, in order of first citation. Sections that share a label get an ordinal so each tag stays distinct.
export function groupEvidenceSources(evidence: readonly EvidenceItem[]): SourceGroup[] {
  const groups = new Map<string, SourceGroup>();
  const seen = new Set<string>();
  for (const item of evidence) {
    if (seen.has(item.evidenceId)) continue;
    seen.add(item.evidenceId);
    const document = isDocumentEvidence(item);
    const key = document ? `document:${item.documentId}` : `case:${item.caseId}`;
    const group = groups.get(key) ?? { key, kind: document ? "document" : "case", title: document ? item.documentTitle : item.caseTitle, tags: [] };
    group.tags.push({ label: tagLabel(item), evidence: item });
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const totals = new Map<string, number>();
    for (const tag of group.tags) totals.set(tag.label, (totals.get(tag.label) ?? 0) + 1);
    const used = new Map<string, number>();
    return { ...group, tags: group.tags.map((tag) => {
      if ((totals.get(tag.label) ?? 0) < 2) return tag;
      const ordinal = (used.get(tag.label) ?? 0) + 1;
      used.set(tag.label, ordinal);
      return { ...tag, label: `${tag.label} ${ordinal}` };
    }) };
  });
}
