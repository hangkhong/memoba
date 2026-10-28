import { describe, expect, it } from "vitest";
import { selectLiveAttempt } from "./presentation";

describe("live attempt presentation", () => {
  const old = { id: "old-attempt" };
  const latest = { id: "latest-attempt" };

  it("discards an old tab's live state after another tab saves a newer attempt", () => {
    const live = { runId: old.id, message: "Old attempt failed", events: ["old activity"] };
    expect(selectLiveAttempt([old, latest], live)).toBeNull();
  });

  it("keeps live activity for the matching latest saved attempt", () => {
    const live = { runId: latest.id, events: ["latest activity"] };
    expect(selectLiveAttempt([old, latest], live)).toBe(live);
  });

  it("keeps a newly admitted attempt until its saved snapshot arrives", () => {
    const live = { runId: "new-attempt", events: ["new activity"] };
    expect(selectLiveAttempt([old, latest], live)).toBe(live);
  });

  it("keeps a pending admission without reusing the previous attempt's state", () => {
    const live = { runId: null, events: [], busy: true };
    expect(selectLiveAttempt([old, latest], live)).toBe(live);
    expect(selectLiveAttempt([old, latest], null)).toBeNull();
  });
});
