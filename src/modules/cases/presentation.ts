import type { Status, Tone } from "@/components/tone";
import type { CaseInput, SectionKey } from "./schema";
import type { z } from "zod";
import type { relationTypeSchema } from "./schema";
export const sectionLabels = { problem: "Problem / objective", context: "Context", constraints: "Constraints", approach: "Approach and reasoning", observedOutcome: "Observed outcome", lessons: "Lessons and applicability", deliverable: "Deliverable", changeScope: "Change scope", deploymentConditions: "Deployment conditions", customerImpact: "Customer impact", handlingConditions: "Handling conditions", escalationNotes: "Escalation notes" } satisfies Record<SectionKey, string>;
export const outcomeLabels = { achieved: "Achieved", not_achieved: "Not achieved", unknown: "Unknown" } satisfies Record<CaseInput["outcome"], string>;
export function publicationLabel(item: { lifecycle: "active" | "archived"; indexState: "pending" | "ready" | "failed"; pendingUpdate: boolean; published: boolean }) {
  if (item.lifecycle === "archived") return "Archived";
  if (item.published && item.pendingUpdate) return item.indexState === "failed" ? "Couldn't prepare your latest edit. Questions still use the previous version." : "Preparing your latest edit. Questions still use the previous version.";
  if (item.published) return "Ready for questions";
  return item.indexState === "failed" ? "Couldn't prepare this case for questions." : "Preparing this case for questions.";
}

export const templateFields = { product_delivery: ["deliverable", "changeScope", "deploymentConditions"], cs_operations: ["customerImpact", "handlingConditions", "escalationNotes"] } as const satisfies Record<CaseInput["template"], SectionKey[]>;
// Section order for the case page: the shared sections, then the template's own, in one flow.
const coreSections = ["problem", "context", "constraints", "approach", "observedOutcome", "lessons"] as const satisfies SectionKey[];
export const sectionOrder = { product_delivery: [...coreSections, ...templateFields.product_delivery], cs_operations: [...coreSections, ...templateFields.cs_operations] } as const satisfies Record<CaseInput["template"], SectionKey[]>;
export const templateLabels = { product_delivery: "Product / Delivery", cs_operations: "CS / Operations" } satisfies Record<CaseInput["template"], string>;

type RelationType = z.infer<typeof relationTypeSchema>;
export type LinkDirection = "outgoing" | "incoming";
// A link reads from the case it starts at; the other end reads the inverse.
export const relationLabels = {
  related_to: { outgoing: "Related to", incoming: "Related to" },
  contrasts_with: { outgoing: "Contrasts with", incoming: "Contrasts with" },
  supersedes: { outgoing: "Supersedes", incoming: "Superseded by" },
} satisfies Record<RelationType, Record<LinkDirection, string>>;

export const relationOrder = ["related_to", "contrasts_with", "supersedes"] as const satisfies RelationType[];
export function relationOptions(direction: LinkDirection) { return relationOrder.map((value) => ({ value, label: relationLabels[value][direction] })); }

export const outcomeTones = { achieved: "success", not_achieved: "danger", unknown: "neutral" } satisfies Record<CaseInput["outcome"], Tone>;
export type CaseStatus = Status;
export function caseStatus(item: { lifecycle: "active" | "archived"; indexState: "pending" | "ready" | "failed"; pendingUpdate: boolean; published: boolean }): CaseStatus {
  if (item.lifecycle === "archived") return "archived";
  if (item.published && item.pendingUpdate) return item.indexState === "failed" ? "failed" : "updating";
  if (item.published) return "available";
  return item.indexState === "failed" ? "failed" : "preparing";
}
