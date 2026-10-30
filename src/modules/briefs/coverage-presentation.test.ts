import { expect, it } from "vitest";
import { coverageLine } from "./coverage-presentation";

const base = { searched: true, previewed: 0, read: 0, searchFailed: false, unreadTitles: [] as string[] };

it("shows nothing when no search was made or the answer has no coverage", () => {
  expect(coverageLine(undefined)).toBeNull();
  expect(coverageLine({ ...base, searched: false })).toBeNull();
});
it("reports how many found cases were read and lists the unread ones", () => {
  expect(coverageLine({ ...base, previewed: 9, read: 3, unreadTitles: ["A", "B"] })).toEqual({ text: "Read 3 of 9 cases found by search", unread: ["A", "B"] });
});
it("reports found cases that were not read", () => {
  expect(coverageLine({ ...base, previewed: 4, unreadTitles: ["A"] })).toEqual({ text: "Found 4 cases, none read", unread: ["A"] });
  expect(coverageLine({ ...base, previewed: 1 })).toMatchObject({ text: "Found 1 case, none read" });
});
it("reports an empty successful search", () => {
  expect(coverageLine(base)).toEqual({ text: "No recorded case found", unread: [] });
});
it("reports an incomplete search before anything else", () => {
  expect(coverageLine({ ...base, searchFailed: true, previewed: 5, read: 2 })).toEqual({ text: "Search incomplete — results may be missing", unread: [] });
});
