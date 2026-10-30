import { describe, expect, it } from "vitest";
import { draftSummary } from "./draft-summary";

const draft = { template: "cs_operations" as const, title: "T", problem: "p", context: "", constraints: "", approach: "a", outcome: "unknown" as const, observedOutcome: "", lessons: "l", sources: [], conceptIds: [], customerImpact: "x", handlingConditions: " ", escalationNotes: "" };
describe("draft summary", () => {
  it("counts only filled sections of the chosen template and labels the missing ones", () => {
    expect(draftSummary(draft, ["context"])).toEqual({ template: "CS / Operations", filled: 4, total: 9, missing: ["Context"] });
  });
});
