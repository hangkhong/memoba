import type { CaseInput, SectionKey } from "./schema";
export const sectionLabels = { problem: "Problem / objective", context: "Context", constraints: "Constraints", approach: "Approach and reasoning", observedOutcome: "Observed outcome", lessons: "Lessons and applicability", deliverable: "Deliverable", changeScope: "Change scope", deploymentConditions: "Deployment conditions", customerImpact: "Customer impact", handlingConditions: "Handling conditions", escalationNotes: "Escalation notes" } satisfies Record<SectionKey, string>;
export const outcomeLabels = { achieved: "Achieved", not_achieved: "Not achieved", unknown: "Unknown" } satisfies Record<CaseInput["outcome"], string>;
export function publicationLabel(item: { lifecycle: "active" | "archived"; indexState: "pending" | "ready" | "failed"; pendingUpdate: boolean; published: boolean }) {
  if (item.lifecycle === "archived") return "Archived";
  if (item.published && item.pendingUpdate) return item.indexState === "failed" ? "Update preparation failed · previous revision available" : "Update not published · previous revision available";
  if (item.published) return "Available to ask";
  return item.indexState === "failed" ? "Preparation failed" : "Preparing for questions";
}

export const templateFields = { product_delivery: ["deliverable", "changeScope", "deploymentConditions"], cs_operations: ["customerImpact", "handlingConditions", "escalationNotes"] } as const satisfies Record<CaseInput["template"], SectionKey[]>;
export const templateLabels = { product_delivery: "Product / Delivery", cs_operations: "CS / Operations" } satisfies Record<CaseInput["template"], string>;

export type Tone = "success" | "warning" | "danger" | "neutral";
// Pale tint with dark text of the same hue; the dot uses the saturated step.
export const toneStyles = {
  success: { pill: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-600" },
  warning: { pill: "bg-amber-50 text-amber-900", dot: "bg-amber-500" },
  danger: { pill: "bg-red-50 text-red-800", dot: "bg-red-600" },
  neutral: { pill: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
} satisfies Record<Tone, { pill: string; dot: string }>;
export const outcomeTones = { achieved: "success", not_achieved: "danger", unknown: "neutral" } satisfies Record<CaseInput["outcome"], Tone>;
export const statusRegistry = {
  available: { label: "Available", tone: "success" },
  updating: { label: "Updating", tone: "warning" },
  preparing: { label: "Preparing", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
  archived: { label: "Archived", tone: "neutral" },
} satisfies Record<string, { label: string; tone: Tone }>;
export type CaseStatus = keyof typeof statusRegistry;
export function caseStatus(item: { lifecycle: "active" | "archived"; indexState: "pending" | "ready" | "failed"; pendingUpdate: boolean; published: boolean }): CaseStatus {
  if (item.lifecycle === "archived") return "archived";
  if (item.published && item.pendingUpdate) return item.indexState === "failed" ? "failed" : "updating";
  if (item.published) return "available";
  return item.indexState === "failed" ? "failed" : "preparing";
}

const day = 86_400_000;
export function relativeDate(iso: string, now: number) {
  const then = new Date(iso);
  const days = Math.floor((Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate()) - Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate())) / day);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(then.getUTCFullYear() === new Date(now).getUTCFullYear() ? {} : { year: "numeric" }), timeZone: "UTC" });
}
