import type { CaseInput } from "./schema";
import { caseStatus, type CaseStatus } from "./presentation";
import type { listCases } from "./repository";

export type CaseRow = { id: string; title: string; problem: string; template: CaseInput["template"]; outcome: CaseInput["outcome"]; lifecycle: "active" | "archived"; status: CaseStatus; concepts: string[]; updatedAt: string };

// Cases without a latest revision have nothing to show yet and are left out.
export function caseRows(cases: Awaited<ReturnType<typeof listCases>>, concepts: readonly { id: string; label: string }[]): CaseRow[] {
  const labels = new Map(concepts.map((concept) => [concept.id, concept.label]));
  return cases.flatMap((item) => {
    if (!item.revision) return [];
    const { content } = item.revision;
    return [{
      id: item.id, title: content.title, problem: content.problem, template: content.template, outcome: content.outcome, lifecycle: item.lifecycle,
      status: caseStatus({ lifecycle: item.lifecycle, indexState: item.revision.index_state, published: !!item.published_revision_id, pendingUpdate: !!item.published_revision_id && item.latest_revision_id !== item.published_revision_id }),
      concepts: content.conceptIds.flatMap((id) => labels.get(id) ?? []), updatedAt: item.revision.created_at,
    }];
  });
}
