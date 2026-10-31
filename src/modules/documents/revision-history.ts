import type { VersionRow } from "@/components/rail";
import type { DocumentInput } from "./schema";

export type DocumentHistoryRevision = { id: string; created_at: string; content: DocumentInput };
const fieldLabels = { title: "Name", description: "Description", body: "Content", type: "Type", area: "Area", owner: "Owner", effectiveFrom: "Effective date", sources: "Sources" } satisfies Record<keyof DocumentInput, string>;
const fields = Object.keys(fieldLabels) as (keyof DocumentInput)[];

// Names the fields whose content differs from the version before it.
export function changeSummary(previous: DocumentInput | undefined, current: DocumentInput) {
  if (!previous) return "Document published";
  const changed = fields.filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(current[field]));
  return changed.length === 0 ? "No content changes" : `Edited ${changed.map((field) => fieldLabels[field]).join(", ")}`;
}
// `revisions` are newest first. Every revision is published, so only the current one is marked live.
export function documentVersionRows(revisions: readonly DocumentHistoryRevision[], context: { publishedId: string | null; archived: boolean }): VersionRow[] {
  return revisions.map((revision, index) => ({ id: revision.id, number: revisions.length - index, state: revision.id === context.publishedId && !context.archived ? "live" : null, createdAt: revision.created_at, summary: changeSummary(revisions[index + 1]?.content, revision.content) }));
}
