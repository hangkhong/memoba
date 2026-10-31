import { OUTCOME_OVERDUE_DAYS, type DashboardSnapshot } from "./snapshot";

// A rate with no denominator is null, so the page prints a dash instead of 0%.
export const percent = (part: number, whole: number) => whole > 0 ? Math.round(part / whole * 100) : null;

export type DashboardMetrics = ReturnType<typeof dashboardMetrics>;
export function dashboardMetrics(snapshot: DashboardSnapshot) {
  const { answers, members, cases } = snapshot;
  const totalCitations = cases.reduce((sum, item) => sum + item.citations, 0);
  const unknownCitations = cases.filter((item) => item.outcome === "unknown").reduce((sum, item) => sum + item.citations, 0);
  const byCitations = cases.filter((item) => item.citations > 0).toSorted((a, b) => b.citations - a.citations);
  const authors = new Map<string, { name: string; citations: number; cases: number }>();
  for (const item of cases) {
    const author = authors.get(item.author) ?? { name: item.author, citations: 0, cases: 0 };
    authors.set(item.author, { ...author, citations: author.citations + item.citations, cases: author.cases + 1 });
  }
  const unsearched = answers.unsearched.cases + answers.unsearched.documents;
  const citedRate = percent(answers.cited, answers.total);
  return {
    answersTotal: answers.total,
    citedRate,
    citedRateDelta: citedRate !== null && answers.priorCitedRatePct !== null ? citedRate - answers.priorCitedRatePct : null,
    unsearched,
    unsearchedRate: percent(unsearched, answers.total),
    returnedRate: percent(members.returnedWithin7Days, members.askedPriorPeriod),
    unknownCitationRate: percent(unknownCitations, totalCitations),
    uncitedRate: percent(cases.filter((item) => item.citations === 0).length, cases.length),
    overdueOutcomes: cases.filter((item) => item.outcome === "unknown" && item.ageDays > OUTCOME_OVERDUE_DAYS).toSorted((a, b) => b.citations - a.citations),
    topCases: byCitations.slice(0, 5),
    contributors: [...authors.values()].toSorted((a, b) => b.citations - a.citations),
  };
}

const ordinals = ["", "second", "third", "fourth", "fifth"];
// The page title states the finding. It names the most-cited case that nobody has recorded an outcome for.
export function dashboardFinding(snapshot: DashboardSnapshot, metrics: DashboardMetrics) {
  if (metrics.citedRate === null) return "No answers in the last 30 days yet.";
  const position = metrics.topCases.findIndex((item) => item.outcome === "unknown");
  const lead = `${metrics.citedRate}% of answers cite evidence`;
  if (position < 0) return snapshot.cases.length === 0 ? `${lead}.` : `${lead}, and every most-cited case has a recorded outcome.`;
  return `${lead}, but the ${position === 0 ? "" : `${ordinals[position]} `}most-cited case has no recorded outcome.`;
}
