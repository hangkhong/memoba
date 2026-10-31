import type { DocumentArea, DocumentType } from "./schema";

export const documentTypeLabels = { policy: "Policy", procedure: "Procedure", guideline: "Guideline" } satisfies Record<DocumentType, string>;
export const documentTypeMeaning = { policy: "Required", procedure: "Required steps", guideline: "Advisory" } satisfies Record<DocumentType, string>;
export const documentAreas = ["Product", "Engineering", "Operations", "Finance", "Legal", "People"] as const satisfies DocumentArea[];
export function effectiveLabel(date: string) { return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); }
