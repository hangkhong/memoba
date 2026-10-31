import { expect, it } from "vitest";
import { documentVersionRows } from "./revision-history";

const revisions = [
  { id: "c", version: 3, change_note: "Tightened exceptions", author_email: "pm@example.test", created_at: "2026-11-03T00:00:00Z" },
  { id: "b", version: 2, change_note: "Notice raised to 90 days", author_email: "pm@example.test", created_at: "2026-11-02T00:00:00Z" },
  { id: "a", version: 1, change_note: "First published", author_email: "", created_at: "2026-11-01T00:00:00Z" },
];
it("shows the stored version, note and author, and links older versions", () => {
  const rows = documentVersionRows(revisions, { documentId: "d", publishedId: "c", archived: false });
  expect(rows.map((row) => [row.number, row.state, row.summary, row.author, row.href, row.selected])).toEqual([
    [3, "live", "Tightened exceptions", "pm@example.test", "/workspace/knowledge/documents/d", true],
    [2, null, "Notice raised to 90 days", "pm@example.test", "/workspace/knowledge/documents/d?version=2", false],
    [1, null, "First published", undefined, "/workspace/knowledge/documents/d?version=1", false],
  ]);
});
it("marks the version on screen and drops the live mark when archived", () => {
  expect(documentVersionRows(revisions, { documentId: "d", publishedId: "c", archived: false, selectedVersion: 2 }).map((row) => row.selected)).toEqual([false, true, false]);
  expect(documentVersionRows(revisions, { documentId: "d", publishedId: "c", archived: true })[0]?.state).toBeNull();
});
