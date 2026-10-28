import { describe, expect, it } from "vitest";
import { caseInputSchema } from "./schema";
const core = { title: "Release checkout", problem: "Reduce failed checkouts", context: "A small product team", constraints: "No downtime", approach: "Ship behind a flag", outcome: "unknown", observedOutcome: "Still measuring", lessons: "Monitor the rollout", sources: [], conceptIds: [] };
describe("fixed case templates", () => {
  it("requires product fields for Product/Delivery", () => {
    expect(caseInputSchema.safeParse({ ...core, template: "product_delivery" }).success).toBe(false);
    expect(caseInputSchema.safeParse({ ...core, template: "product_delivery", deliverable: "Checkout", changeScope: "Payments", deploymentConditions: "Flag enabled" }).success).toBe(true);
  });
  it("requires CS fields and never infers a successful outcome", () => {
    expect(caseInputSchema.safeParse({ ...core, outcome: undefined, template: "cs_operations", customerImpact: "Unable to sign in", handlingConditions: "Verified identity", escalationNotes: "Escalate to support" }).success).toBe(false);
  });
  it("rejects third templates, unsafe reference URLs, and oversized fields", () => {
    const valid = { ...core, template: "product_delivery", deliverable: "Checkout", changeScope: "Payments", deploymentConditions: "Flag enabled" };
    expect(caseInputSchema.safeParse({ ...valid, template: "custom" }).success).toBe(false);
    expect(caseInputSchema.safeParse({ ...valid, sources: [{ label: "Source", url: "javascript:alert(1)" }] }).success).toBe(false);
    expect(caseInputSchema.safeParse({ ...valid, title: "x".repeat(201) }).success).toBe(false);
    expect(caseInputSchema.safeParse({ ...valid, context: "x".repeat(4001) }).success).toBe(false);
    expect(caseInputSchema.safeParse({ ...valid, workspaceId: "forged" }).success).toBe(false);
  });
});
