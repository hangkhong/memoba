import { expect, it } from "vitest";
import { requestSchema } from "./schema";
import { buildRequestPlan, resolvePlannerResult } from "./planner";
const request = { template: "product_delivery", version: 1, objective: "Reduce release failures", context: "Vietnamese and English knowledge", hardConstraints: [{ kind: "prohibition", text: "No downtime" }], conceptIds: [], unknowns: "Unknown adoption" };
it("rejects workspace selection and too many hard constraints at intake", () => {
  expect(requestSchema.safeParse({ ...request, workspaceId: "forged" }).success).toBe(false);
  expect(requestSchema.safeParse({ ...request, hardConstraints: Array.from({ length: 9 }, () => ({ kind: "requirement", text: "Must retain data" })) }).success).toBe(false);
});
it("builds method, conditions, and exceptions queries without changing constraints", () => {
  const input = requestSchema.parse(request);
  const plan = buildRequestPlan(input);
  expect(plan.queries.map((query) => query.purpose)).toEqual(["method", "conditions", "exceptions"]);
  expect(plan.request.hardConstraints).toEqual([{ kind: "prohibition", text: "No downtime" }]);
});
it("falls back if a planner tries to change hard constraints", () => {
  const input = requestSchema.parse(request);
  const resolved = resolvePlannerResult({ request: input, output: { queries: [{ purpose: "method", query: "Deployment" }], hardConstraints: [] } });
  expect(resolved.source).toBe("deterministic");
  expect(resolved.plan.request.hardConstraints).toEqual([{ kind: "prohibition", text: "No downtime" }]);
});
