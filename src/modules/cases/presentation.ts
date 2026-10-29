import type { CaseInput, SectionKey } from "./schema";
export const sectionLabels = { problem: "Problem / objective", context: "Context", constraints: "Constraints", approach: "Approach and reasoning", observedOutcome: "Observed outcome", lessons: "Lessons and applicability", deliverable: "Deliverable", changeScope: "Change scope", deploymentConditions: "Deployment conditions", customerImpact: "Customer impact", handlingConditions: "Handling conditions", escalationNotes: "Escalation notes" } satisfies Record<SectionKey, string>;
export const outcomeLabels = { achieved: "Achieved", not_achieved: "Not achieved", unknown: "Unknown" } satisfies Record<CaseInput["outcome"], string>;
export function publicationLabel(item: { lifecycle: "active" | "archived"; indexState: "pending" | "ready" | "failed"; pendingUpdate: boolean; published: boolean }) {
  if (item.lifecycle === "archived") return "Archived";
  if (item.published && item.pendingUpdate) return item.indexState === "failed" ? "Update preparation failed · previous revision available" : "Update not published · previous revision available";
  if (item.published) return "Available to ask";
  return item.indexState === "failed" ? "Preparation failed" : "Preparing for questions";
}
