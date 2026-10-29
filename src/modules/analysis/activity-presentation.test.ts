import { describe, expect, it } from "vitest";
import { activityGroups } from "./activity-presentation";
import type { AnalysisEvent } from "./events";
const event = (state: AnalysisEvent["state"], tool: AnalysisEvent["tool"] = "read_case"): AnalysisEvent => ({ stage: "tool", state, tool, at: "2026-10-29T12:00:00Z" });
describe("activity presentation", () => {
  it("groups parallel calls without inventing identities", () => {
    const groups = activityGroups([event("started"), event("started"), event("completed")], "running");
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ completed: 1, unfinished: 1, state: "running" });
  });
  it("preserves errors after a successful run and first-seen order", () => {
    const groups = activityGroups([event("started", "search_cases"), event("failed", "search_cases"), event("started"), event("completed")], "complete");
    expect(groups.map((group) => group.key)).toEqual(["search_cases", "read_case"]);
    expect(groups[0]?.state).toBe("error");
  });
  it.each(["cancelled", "timed_out"] as const)("keeps unfinished steps unfinished after %s", (status) => {
    expect(activityGroups([event("started")], status)[0]).toMatchObject({ state: "pending", completed: 0, unfinished: 1 });
  });
});
