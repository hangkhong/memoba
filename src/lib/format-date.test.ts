import { expect, it } from "vitest";
import { formatDate } from "./format-date";

it("formats a date and a datetime the same way, in UTC", () => {
  expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
  expect(formatDate("2026-01-01T23:30:00-05:00")).toBe("2 Jan 2026");
});
