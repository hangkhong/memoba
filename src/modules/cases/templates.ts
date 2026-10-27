import type { CaseInput } from "./schema";
export const templates = [
  { id: "product_delivery", label: "Product / Delivery", description: "Product changes, delivery decisions, and deployment conditions." },
  { id: "cs_operations", label: "CS / Operations", description: "Customer issues, handling conditions, and escalations." },
] satisfies { id: CaseInput["template"]; label: string; description: string }[];
