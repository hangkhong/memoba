import { sectionLabels, sectionOrder } from "./presentation";
import type { VersionRow } from "@/components/rail";
import type { CaseInput, SectionKey } from "./schema";

export type HistoryRevision = { id: string; created_at: string; index_state: "pending" | "ready" | "failed"; content: CaseInput };

const sectionKeys: SectionKey[] = [...new Set([...sectionOrder.product_delivery, ...sectionOrder.cs_operations])];
const fieldLabels = { title: "Title", template: "Template", ...sectionLabels, outcome: "Outcome", conceptIds: "Concepts", sources: "Sources" } satisfies Record<string, string>;
const comparedFields = ["title", "template", ...sectionKeys, "outcome", "conceptIds", "sources"] as const satisfies (keyof typeof fieldLabels)[];

function comparable(content: CaseInput, field: (typeof comparedFields)[number]) {
  const value = (content as Record<string, unknown>)[field];
  if (field === "conceptIds") return JSON.stringify([...content.conceptIds].sort());
  if (field === "sources") return JSON.stringify(content.sources);
  return typeof value === "string" ? value : "";
}

// Names the fields whose content differs from the version before it.
export function changeSummary(previous: CaseInput | undefined, current: CaseInput) {
  if (!previous) return "Case recorded";
  const changed = comparedFields.filter((field) => comparable(previous, field) !== comparable(current, field));
  return changed.length === 0 ? "No content changes" : `Edited ${changed.map((field) => fieldLabels[field]).join(", ")}`;
}

// `revisions` are newest first. Versions are numbered from the oldest.
export function versionRows(revisions: readonly HistoryRevision[], context: { publishedId: string | null; archived: boolean }): VersionRow[] {
  return revisions.map((revision, index) => ({
    id: revision.id,
    number: revisions.length - index,
    state: revision.id === context.publishedId ? (context.archived ? null : "live") : revision.index_state === "pending" ? "preparing" : revision.index_state === "failed" ? "failed" : null,
    createdAt: revision.created_at,
    summary: changeSummary(revisions[index + 1]?.content, revision.content),
  }));
}
