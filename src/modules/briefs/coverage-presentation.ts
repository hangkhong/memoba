import type { AnswerCoverage } from "./schema";

export type UnreadCase = { title: string; caseId: string | null };
export type CoverageLine = { text: string; unread: UnreadCase[]; more: number };

// One muted line above an answer, derived from the saved coverage. Null means show nothing.
// `more` counts unread cases beyond the capped list saved with the answer.
export function coverageLine(coverage: AnswerCoverage | undefined): CoverageLine | null {
  if (!coverage?.searched) return null;
  if (coverage.searchFailed) return { text: "Search incomplete — results may be missing", unread: [], more: 0 };
  const unread = coverage.unreadTitles.map((title, index) => ({ title, caseId: coverage.unreadCaseIds?.[index] ?? null }));
  const more = Math.max(0, coverage.previewed - coverage.read - unread.length);
  if (coverage.read > 0) return { text: `Read ${coverage.read} of ${coverage.previewed} cases found by search`, unread, more };
  if (coverage.previewed > 0) return { text: `Found ${coverage.previewed} ${coverage.previewed === 1 ? "case" : "cases"}, none read`, unread, more };
  return { text: "No recorded case found", unread: [], more: 0 };
}

export function moreUnreadLabel(more: number): string {
  return `and ${more} more`;
}
