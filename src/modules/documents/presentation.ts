import { formatDate } from "../../lib/format-date.ts";
import type { DocumentArea, DocumentType } from "./schema";

export const documentTypeLabels = { policy: "Policy", procedure: "Procedure", guideline: "Guideline" } satisfies Record<DocumentType, string>;
export const documentTypeMeaning = { policy: "Required", procedure: "Required steps", guideline: "Advisory" } satisfies Record<DocumentType, string>;
export const documentAreas = ["Product", "Engineering", "Operations", "Finance", "Legal", "People"] as const satisfies DocumentArea[];
export const effectiveLabel = formatDate;
