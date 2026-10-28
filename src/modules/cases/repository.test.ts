import { expect, it } from "vitest";
import { revisionSchema } from "./repository";
it("accepts PostgreSQL timezone offsets at the database boundary", () => {
  const content = { template: "product_delivery", title: "Release", problem: "Risk", context: "Team", constraints: "No downtime", approach: "Canary", outcome: "unknown", observedOutcome: "Unknown", lessons: "Monitor", sources: [], conceptIds: [], deliverable: "Feature", changeScope: "Checkout", deploymentConditions: "Rollback" };
  expect(revisionSchema.safeParse({ id: crypto.randomUUID(), case_id: crypto.randomUUID(), content, index_state: "pending", created_at: "2026-10-28T00:00:00+00:00" }).success).toBe(true);
});
