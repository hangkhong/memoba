import { dashboardMetrics } from "./metrics";
import { UNMATCHED_WEIGHT, type DashboardSnapshot } from "./snapshot";

export type AttentionKind = "outcome_missing" | "no_matching_case" | "review_due" | "search_failed";
export type AttentionAction = "record_outcome" | "record_case" | "open_document" | "view_answers";
export type AttentionItem = { kind: AttentionKind; score: number; title: string; evidence: string; owner: string; action: AttentionAction; subjectId: string | null };

export const attentionKindLabels = { outcome_missing: "Outcome missing", no_matching_case: "No matching case", review_due: "Review due", search_failed: "Search failed" } satisfies Record<AttentionKind, string>;
export const attentionActionLabels = { record_outcome: "Record outcome", record_case: "Record case", open_document: "Open document", view_answers: "View answers" } satisfies Record<AttentionAction, string>;

const times = (count: number) => count === 1 ? "once" : `${count} times`;

// One ranked list across all four kinds. Citations score themselves; an unmatched question or a failed answer scores UNMATCHED_WEIGHT times its count.
export function buildAttentionQueue(snapshot: DashboardSnapshot): AttentionItem[] {
  const { overdueOutcomes, unsearched } = dashboardMetrics(snapshot);
  const { answers } = snapshot;
  const items: AttentionItem[] = [
    ...overdueOutcomes.map((item): AttentionItem => ({ kind: "outcome_missing", score: item.citations, title: item.title, evidence: `Cited ${times(item.citations)}, recorded ${item.ageDays} days ago`, owner: item.author, action: "record_outcome", subjectId: item.id })),
    ...snapshot.knowledgeGaps.map((gap): AttentionItem => ({ kind: "no_matching_case", score: gap.asks * UNMATCHED_WEIGHT, title: gap.topic, evidence: `Asked ${times(gap.asks)}, no case matched`, owner: "Unassigned", action: "record_case", subjectId: null })),
    ...snapshot.documentsDueForReview.map((doc): AttentionItem => ({ kind: "review_due", score: doc.citations, title: doc.title, evidence: `Cited ${times(doc.citations)}, in force for ${doc.daysInForce} days`, owner: doc.owner, action: "open_document", subjectId: doc.id })),
    ...(unsearched > 0 ? [{ kind: "search_failed", score: unsearched * UNMATCHED_WEIGHT, title: "Sources could not be searched", evidence: `${unsearched} answers: documents ${answers.unsearched.documents}, cases ${answers.unsearched.cases}`, owner: "Workspace admin", action: "view_answers", subjectId: null } satisfies AttentionItem] : []),
  ];
  // Equal scores keep a fixed order, so the list does not reshuffle between renders.
  return items.toSorted((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

// A row whose case or document did not resolve has no target, so the page prints no action for it.
export function attentionHref(item: Pick<AttentionItem, "action" | "subjectId">, latestConversationId: string | null): string | null {
  switch (item.action) {
    case "record_outcome": return item.subjectId ? `/workspace/knowledge/${item.subjectId}?edit=1` : null;
    case "record_case": return "/workspace/knowledge?record=1";
    case "open_document": return item.subjectId ? `/workspace/knowledge/documents/${item.subjectId}` : null;
    case "view_answers": return latestConversationId ? `/workspace/chat/${latestConversationId}` : null;
  }
}
