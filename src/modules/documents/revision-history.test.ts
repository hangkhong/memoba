import { expect, it } from "vitest";
import { changeSummary, documentVersionRows } from "./revision-history";
import type { DocumentInput } from "./schema";

const base: DocumentInput = { title: "Release", description: "When to release.", body: "## A\n\nx\n\n## B\n\ny", type: "procedure", area: "Engineering", owner: "Platform", effectiveFrom: "2026-11-01", sources: [] };
it("names the changed fields and numbers versions from the oldest", () => {
  expect(changeSummary(undefined, base)).toBe("Document published");
  expect(changeSummary(base, base)).toBe("No content changes");
  expect(changeSummary(base, { ...base, body: "changed", owner: "Ops" })).toBe("Edited Content, Owner");
  const rows = documentVersionRows([{ id: "b", created_at: "2026-11-02T00:00:00Z", content: { ...base, type: "policy" } }, { id: "a", created_at: "2026-11-01T00:00:00Z", content: base }], { publishedId: "b", archived: false });
  expect(rows.map((row) => [row.number, row.state, row.summary])).toEqual([[2, "live", "Edited Type"], [1, null, "Document published"]]);
  expect(documentVersionRows([{ id: "b", created_at: "2026-11-02T00:00:00Z", content: base }], { publishedId: "b", archived: true })[0]?.state).toBeNull();
});
