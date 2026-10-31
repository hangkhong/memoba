import type { Status } from "@/components/tone";
import type { DocumentInput } from "./schema";
import type { listDocuments } from "./repository";

export type DocumentRow = { id: string; title: string; description: string; type: DocumentInput["type"]; area: DocumentInput["area"]; owner: string; effectiveFrom: string; lifecycle: "active" | "archived"; status: Status };

// A document without a published revision cannot exist (publishing is atomic), so rows are always complete. Sorted by name.
export function documentRows(documents: Awaited<ReturnType<typeof listDocuments>>): DocumentRow[] {
  return documents.flatMap((item) => {
    if (!item.revision) return [];
    const { content } = item.revision;
    return [{ id: item.id, title: content.title, description: content.description, type: content.type, area: content.area, owner: content.owner, effectiveFrom: content.effectiveFrom, lifecycle: item.lifecycle, status: item.lifecycle === "archived" ? "archived" as const : "available" as const }];
  }).toSorted((a, b) => a.title.localeCompare(b.title));
}
