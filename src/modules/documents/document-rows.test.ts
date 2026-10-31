import { expect, it } from "vitest";
import { documentRows } from "./document-rows";

const content = (title: string) => ({ title, description: "d", body: "b", type: "policy" as const, area: "Finance" as const, owner: "o", effectiveFrom: "2026-11-01", sources: [] });
it("sorts rows by name and marks archived documents", () => {
  const record = (id: string, title: string, lifecycle: "active" | "archived") => ({ id, lifecycle, published_revision_id: `${id}-r`, created_at: "2026-11-01T00:00:00Z", revision: { id: `${id}-r`, document_id: id, content: content(title), created_at: "2026-11-01T00:00:00Z" } });
  const rows = documentRows([record("1", "Refunds", "active"), record("2", "Data deletion", "archived"), { ...record("3", "x", "active"), revision: undefined }]);
  expect(rows.map((row) => [row.title, row.status])).toEqual([["Data deletion", "archived"], ["Refunds", "available"]]);
});
