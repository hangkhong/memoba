import type { CaseInput } from "../../src/modules/cases/schema";
import type { FixtureCase } from "../local-v0/corpus";

export const rolloutConceptId = "41000000-0000-4000-8000-000000000001";
export const pricingConceptId = "41000000-0000-4000-8000-000000000002";
export const incidentConceptId = "41000000-0000-4000-8000-000000000003";
export const retentionConceptId = "41000000-0000-4000-8000-000000000004";
export const demoConcepts = [
  { id: rolloutConceptId, kind: "approach", label: "Staged rollout", aliases: ["canary", "phased launch", "gradual release"] },
  { id: pricingConceptId, kind: "problem_type", label: "Pricing change", aliases: ["price increase", "plan change"] },
  { id: incidentConceptId, kind: "approach", label: "Incident communication", aliases: ["status page", "outage updates"] },
  { id: retentionConceptId, kind: "problem_type", label: "Customer retention", aliases: ["churn", "cancellation"] },
] as const;

type Shared = { slug: string; title: string; problem: string; context: string; constraints: string; approach: string; outcome: CaseInput["outcome"]; observedOutcome: string; lessons: string; conceptIds: string[]; sources: { label: string; url: string }[] };
type Product = Shared & { deliverable: string; changeScope: string; deploymentConditions: string };
type Operations = Shared & { customerImpact: string; handlingConditions: string; escalationNotes: string };

export const wiki = (path: string) => `https://wiki.northwind-ledger.example/${path}`;

export function product({ slug, ...rest }: Product): FixtureCase {
  return { slug, input: { template: "product_delivery", ...rest } };
}
export function operations({ slug, ...rest }: Operations): FixtureCase {
  return { slug, input: { template: "cs_operations", ...rest } };
}
