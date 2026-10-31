import { describe, expect, it } from "vitest";
import { caseRows } from "./case-rows";
import { caseStatus } from "./presentation";
import { relativeDate } from "@/lib/relative-date";
import type { listCases } from "./repository";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
type Listed = Awaited<ReturnType<typeof listCases>>;
const content = { template: "product_delivery" as const, title: "Canary", problem: "Risky release", context: "c", constraints: "", approach: "a", outcome: "achieved" as const, observedOutcome: "ok", lessons: "", sources: [], conceptIds: [id(1), id(9)], deliverable: "", changeScope: "", deploymentConditions: "" };
const record = (over: Partial<Listed[number]>): Listed[number] => ({ id: id(2), lifecycle: "active", published_revision_id: id(3), latest_revision_id: id(3), created_at: "2026-10-01T00:00:00+00:00", revision: { id: id(3), case_id: id(2), content, index_state: "ready", created_at: "2026-10-20T08:00:00+00:00" }, ...over });
describe("case rows", () => {
  it("maps concept labels, drops unknown concepts, and uses the latest revision date", () => {
    const [row] = caseRows([record({})], [{ id: id(1), label: "Release" }]);
    expect(row).toMatchObject({ title: "Canary", concepts: ["Release"], status: "available", updatedAt: "2026-10-20T08:00:00+00:00" });
  });
  it("skips cases without a revision", () => { expect(caseRows([record({ revision: undefined })], [])).toEqual([]); });
});
describe("status registry", () => {
  const base = { lifecycle: "active" as const, indexState: "ready" as const, pendingUpdate: false, published: true };
  it.each([
    [base, "available"], [{ ...base, pendingUpdate: true }, "updating"], [{ ...base, pendingUpdate: true, indexState: "failed" as const }, "failed"],
    [{ ...base, published: false, indexState: "pending" as const }, "preparing"], [{ ...base, published: false, indexState: "failed" as const }, "failed"], [{ ...base, lifecycle: "archived" as const }, "archived"],
  ])("classifies %j as %s", (item, expected) => { expect(caseStatus(item)).toBe(expected); });
});
describe("relative date", () => {
  const now = Date.UTC(2026, 9, 30, 12);
  it("uses day granularity", () => {
    expect(relativeDate("2026-10-30T01:00:00Z", now)).toBe("Today");
    expect(relativeDate("2026-10-29T23:00:00Z", now)).toBe("Yesterday");
    expect(relativeDate("2026-10-27T10:00:00Z", now)).toBe("3 days ago");
    expect(relativeDate("2026-10-01T10:00:00Z", now)).toBe("1 Oct");
    expect(relativeDate("2025-10-01T10:00:00Z", now)).toBe("1 Oct 2025");
  });
});
