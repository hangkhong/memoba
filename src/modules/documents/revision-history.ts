import type { VersionRow } from "@/components/rail";

export type DocumentHistoryRevision = { id: string; version: number; change_note: string; author_email: string; created_at: string };
// `revisions` are newest first. Every revision is published, so only the newest of an active document is live.
export function documentVersionRows(revisions: readonly DocumentHistoryRevision[], context: { documentId: string; publishedId: string | null; archived: boolean; selectedVersion?: number }): VersionRow[] {
  return revisions.map((revision) => ({
    id: revision.id, number: revision.version, state: revision.id === context.publishedId && !context.archived ? "live" : null, createdAt: revision.created_at,
    summary: revision.change_note, author: revision.author_email || undefined,
    href: `/workspace/knowledge/documents/${context.documentId}${revision.id === context.publishedId ? "" : `?version=${revision.version}`}`,
    selected: revision.version === (context.selectedVersion ?? revisions.find((item) => item.id === context.publishedId)?.version),
  }));
}
