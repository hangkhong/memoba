import { expect, it } from "vitest";
import { coverageLine, moreUnreadLabel } from "./coverage-presentation";

const base = { searched: true, previewed: 0, read: 0, searchFailed: false, unreadTitles: [] as string[] };

it("shows nothing when no search was made or the answer has no coverage", () => {
  expect(coverageLine(undefined)).toBeNull();
  expect(coverageLine({ ...base, searched: false })).toBeNull();
});
it("reports how many found cases were read and lists the unread ones", () => {
  expect(coverageLine({ ...base, previewed: 9, read: 3, unreadTitles: ["A", "B"] })).toEqual({ text: "Read 3 of 9 cases found by search", unread: [{ title: "A", caseId: null }, { title: "B", caseId: null }], more: 4 });
});
it("reports found cases that were not read", () => {
  expect(coverageLine({ ...base, previewed: 4, unreadTitles: ["A"] })).toEqual({ text: "Found 4 cases, none read", unread: [{ title: "A", caseId: null }], more: 3 });
  expect(coverageLine({ ...base, previewed: 1 })).toMatchObject({ text: "Found 1 case, none read", more: 1 });
});
it("reports an empty successful search", () => {
  expect(coverageLine(base)).toEqual({ text: "No recorded case found", unread: [], more: 0 });
});
it("reports an incomplete search before anything else", () => {
  expect(coverageLine({ ...base, searchFailed: true, previewed: 5, read: 2 })).toEqual({ text: "Search incomplete — results may be missing", unread: [], more: 0 });
});
it("links unread cases when ids were saved and counts the ones beyond the cap", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const titles = Array.from({ length: 10 }, (_, index) => `Case ${index}`);
  const line = coverageLine({ ...base, previewed: 18, read: 2, unreadTitles: titles, unreadCaseIds: titles.map(() => id) });
  expect(line?.unread[0]).toEqual({ title: "Case 0", caseId: id });
  expect(line?.more).toBe(6);
  expect(moreUnreadLabel(6)).toBe("and 6 more");
});
