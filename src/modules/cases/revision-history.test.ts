import { describe, expect, it } from "vitest";
import { changeSummary, versionRows, type HistoryRevision } from "./revision-history";
import type { CaseInput } from "./schema";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const base: Extract<CaseInput, { template: "product_delivery" }> = { template: "product_delivery", title: "Canary", problem: "Risky release", context: "Small team", constraints: "", approach: "Canary", outcome: "unknown", observedOutcome: "", lessons: "", sources: [], conceptIds: [id(1), id(2)], deliverable: "", changeScope: "", deploymentConditions: "" };

describe("changeSummary", () => {
  it("reads the first version as the case being recorded", () => { expect(changeSummary(undefined, base)).toBe("Case recorded"); });
  it("names edited fields in page order", () => {
    expect(changeSummary(base, { ...base, observedOutcome: "It worked", approach: "Canary with rollback" })).toBe("Edited Approach and reasoning, Observed outcome");
  });
  it("reports identical content", () => { expect(changeSummary(base, { ...base, conceptIds: [id(2), id(1)] })).toBe("No content changes"); });
  it("covers outcome, concepts, sources and title", () => {
    expect(changeSummary(base, { ...base, title: "Canary v2", outcome: "achieved", conceptIds: [id(1)], sources: [{ label: "Doc", url: "https://example.com" }] })).toBe("Edited Title, Outcome, Concepts, Sources");
  });
  it("lists the old template's fields when the template changes", () => {
    const cs: CaseInput = { template: "cs_operations", title: base.title, problem: base.problem, context: base.context, constraints: "", approach: base.approach, outcome: "unknown", observedOutcome: "", lessons: "", sources: [], conceptIds: base.conceptIds, customerImpact: "", handlingConditions: "", escalationNotes: "" };
    expect(changeSummary({ ...base, deliverable: "Release" }, cs)).toBe("Edited Template, Deliverable");
  });
});

describe("versionRows", () => {
  const revision = (n: number, over: Partial<HistoryRevision> = {}): HistoryRevision => ({ id: id(n), created_at: `2026-10-0${n}T08:00:00+00:00`, index_state: "ready", content: base, ...over });
  const revisions = [revision(3, { content: { ...base, approach: "Changed" }, index_state: "pending" }), revision(2, { index_state: "failed" }), revision(1)];
  it("numbers from the oldest and derives state and summary", () => {
    expect(versionRows(revisions, { publishedId: id(1), archived: false }).map(({ number, state, summary }) => [number, state, summary])).toEqual([
      [3, "preparing", "Edited Approach and reasoning"], [2, "failed", "No content changes"], [1, "live", "Case recorded"],
    ]);
  });
  it("shows no live version once the case is archived", () => {
    expect(versionRows([revision(1)], { publishedId: id(1), archived: true })[0]?.state).toBeNull();
  });
  it("leaves ready, older versions without a state", () => {
    expect(versionRows([revision(2), revision(1)], { publishedId: id(2), archived: false }).map((row) => row.state)).toEqual(["live", null]);
  });
});
