import { describe, expect, it } from "vitest";
import { activityGroups, activitySteps } from "./activity-presentation";
import type { AnalysisEvent } from "./events";
const event = (state: AnalysisEvent["state"], tool: AnalysisEvent["tool"] = "read_case", extra: Partial<AnalysisEvent> = {}): AnalysisEvent => ({ stage: "tool", state, tool, at: "2026-10-29T12:00:00Z", ...extra });
const stage = (state: AnalysisEvent["state"], name: AnalysisEvent["stage"]): AnalysisEvent => ({ stage: name, state, at: "2026-10-29T12:00:00Z" });
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
  it("describes finished steps in plain language from recorded counts", () => {
    const steps = activitySteps([stage("completed", "intake"), event("started", "search_cases"), event("completed", "search_cases", { count: 14 }), event("started"), event("completed", "read_case", { count: 2 }), stage("completed", "validation"), stage("completed", "completion")], "complete");
    expect(steps.map((step) => step.text)).toEqual(["Understood your question", "Searched your knowledge · 14 cases found", "Read 2 cases", "Checked sources", "Wrote the answer"]);
  });
  it("omits a count the events did not record", () => {
    expect(activitySteps([event("started", "search_cases"), event("completed", "search_cases")], "complete")[0]?.text).toBe("Searched your knowledge");
    expect(activitySteps([event("started"), event("completed"), event("started"), event("completed")], "complete")[0]?.text).toBe("Read case details");
  });
  it("shows running, failed and stopped steps without codes or state words", () => {
    expect(activitySteps([event("started", "search_cases")], "running")[0]).toMatchObject({ text: "Searching your knowledge", state: "running" });
    expect(activitySteps([event("started", "search_cases"), event("failed", "search_cases", { code: "TIMEOUT" })], "complete")[0]).toMatchObject({ text: "Couldn't search your knowledge", state: "error" });
    expect(activitySteps([event("started")], "cancelled")[0]).toMatchObject({ text: "Stopped while reading cases", state: "pending" });
  });
  it("states what each source returned from the recorded tool code, not from model text", () => {
    const text = (code?: string) => activitySteps([event("started", "search_knowledge"), event("completed", "search_knowledge", code ? { code } : {})], "complete")[0]?.text;
    expect(text("cases:found:3;documents:none:0")).toBe("Searched cases and documents · 3 cases found · no documents matched");
    expect(text("cases:found:1;documents:failed:0")).toBe("Searched cases and documents · 1 case found · documents could not be searched");
    expect(text("cases:none:0;documents:partial:2")).toBe("Searched cases and documents · no cases matched · 2 documents found, search incomplete");
    expect(text()).toBe("Searched your knowledge");
    expect(text("garbage")).toBe("Searched your knowledge");
    expect(activitySteps([event("started", "read_document"), event("completed", "read_document")], "complete")[0]?.text).toBe("Read process document details");
    expect(activitySteps([event("started", "read_document")], "running")[0]).toMatchObject({ text: "Reading process documents", state: "running" });
  });
});
