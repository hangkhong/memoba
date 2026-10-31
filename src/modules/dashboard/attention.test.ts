import { describe, expect, it } from "vitest";
import { attentionHref, buildAttentionQueue } from "./attention";
import { dashboardFinding, dashboardMetrics } from "./metrics";
import { sampleSnapshot } from "./sample-snapshot";
import { UNMATCHED_WEIGHT, type DashboardSnapshot } from "./snapshot";

const now = new Date("2026-10-31T12:00:00Z");
const base = (): DashboardSnapshot => ({ ...sampleSnapshot(now), cases: [], documentsDueForReview: [], knowledgeGaps: [], answers: { total: 10, cited: 8, priorCitedRatePct: null, unsearched: { cases: 0, documents: 0 }, p90Seconds: null } });
const unknownCase = (title: string, citations: number, ageDays: number): DashboardSnapshot["cases"][number] => ({ id: null, title, author: "A", outcome: "unknown", citations, ageDays });

describe("buildAttentionQueue", () => {
  it("ranks the four kinds in one list by score, highest first", () => {
    const queue = buildAttentionQueue(sampleSnapshot(now));
    expect(queue.map((item) => item.score)).toEqual([...queue.map((item) => item.score)].sort((a, b) => b - a));
    expect(new Set(queue.map((item) => item.kind))).toEqual(new Set(["outcome_missing", "no_matching_case", "review_due", "search_failed"]));
    expect(queue.slice(0, 3).map((item) => item.title)).toEqual(["Xero integration rebuilt in one sprint", "Sources could not be searched", "Price change policy"]);
  });

  it("counts one unmatched question as three citations", () => {
    const snapshot = { ...base(), cases: [unknownCase("Thirty citations", 30, 60)], knowledgeGaps: [{ topic: "Ten asks", asks: 10 }, { topic: "Nine asks", asks: 9 }] };
    const queue = buildAttentionQueue(snapshot);
    expect(UNMATCHED_WEIGHT).toBe(3);
    expect(queue.map((item) => [item.title, item.score])).toEqual([["Ten asks", 30], ["Thirty citations", 30], ["Nine asks", 27]]);
  });

  it("weights failed searches by the number of failed answers", () => {
    const snapshot = { ...base(), answers: { ...base().answers, unsearched: { cases: 2, documents: 3 } } };
    expect(buildAttentionQueue(snapshot)).toMatchObject([{ kind: "search_failed", score: 15, evidence: "5 answers: documents 3, cases 2" }]);
  });

  it("lists only unknown cases older than 30 days, and breaks equal scores by title", () => {
    const snapshot = { ...base(), cases: [unknownCase("Fresh", 99, 30), unknownCase("Old B", 5, 31), unknownCase("Old A", 5, 90), { ...unknownCase("Known", 50, 90), outcome: "achieved" as const }] };
    expect(buildAttentionQueue(snapshot).map((item) => item.title)).toEqual(["Old A", "Old B"]);
  });

  it("is empty when nothing needs attention", () => {
    expect(buildAttentionQueue(base())).toEqual([]);
  });
});

describe("attentionHref", () => {
  it("links to the real target, and returns null when the target did not resolve", () => {
    expect(attentionHref({ action: "record_outcome", subjectId: "c1" }, null)).toBe("/workspace/knowledge/c1?edit=1");
    expect(attentionHref({ action: "record_outcome", subjectId: null }, null)).toBeNull();
    expect(attentionHref({ action: "open_document", subjectId: "d1" }, null)).toBe("/workspace/knowledge/documents/d1");
    expect(attentionHref({ action: "open_document", subjectId: null }, null)).toBeNull();
    expect(attentionHref({ action: "record_case", subjectId: null }, null)).toBe("/workspace/knowledge?record=1");
    expect(attentionHref({ action: "view_answers", subjectId: null }, "v1")).toBe("/workspace/chat/v1");
    expect(attentionHref({ action: "view_answers", subjectId: null }, null)).toBeNull();
  });
});

describe("dashboardMetrics", () => {
  it("derives every total from the rows", () => {
    const snapshot = sampleSnapshot(now);
    const metrics = dashboardMetrics(snapshot);
    expect(metrics.contributors.reduce((sum, person) => sum + person.citations, 0)).toBe(snapshot.cases.reduce((sum, item) => sum + item.citations, 0));
    expect(metrics.contributors.reduce((sum, person) => sum + person.cases, 0)).toBe(snapshot.cases.length);
    expect(metrics.citedRate).toBe(87);
    expect(dashboardFinding(snapshot, metrics)).toBe("87% of answers cite evidence, but the third most-cited case has no recorded outcome.");
  });

  it("prints no rate when there is no denominator", () => {
    const empty: DashboardSnapshot = { ...base(), answers: { total: 0, cited: 0, priorCitedRatePct: null, unsearched: { cases: 0, documents: 0 }, p90Seconds: null } };
    const metrics = dashboardMetrics(empty);
    expect(metrics.citedRate).toBeNull();
    expect(dashboardFinding(empty, metrics)).toBe("No answers in the last 30 days yet.");
  });
});
