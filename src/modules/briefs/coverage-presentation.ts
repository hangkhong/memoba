import type { AnswerCoverage } from "./schema";

// One muted line above an answer, derived from the saved coverage. Null means show nothing.
export function coverageLine(coverage: AnswerCoverage | undefined): { text: string; unread: string[] } | null {
  if (!coverage?.searched) return null;
  if (coverage.searchFailed) return { text: "Search incomplete — results may be missing", unread: [] };
  if (coverage.read > 0) return { text: `Read ${coverage.read} of ${coverage.previewed} cases found by search`, unread: coverage.unreadTitles };
  if (coverage.previewed > 0) return { text: `Found ${coverage.previewed} ${coverage.previewed === 1 ? "case" : "cases"}, none read`, unread: coverage.unreadTitles };
  return { text: "No recorded case found", unread: [] };
}
