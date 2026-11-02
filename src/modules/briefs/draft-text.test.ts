import { expect, it } from "vitest";
import { draftDisplayText } from "./draft-text";

it("removes complete and half-streamed citation markers", () => {
  expect(draftDisplayText("Pilot worked. [S:abc:1] Next [S:abc:2].")).toBe("Pilot worked. Next.");
  expect(draftDisplayText("Pilot worked. [S:ab")).toBe("Pilot worked. ");
  expect(draftDisplayText("Pilot worked. [")).toBe("Pilot worked. [");
});
it("leaves ordinary brackets alone", () => {
  expect(draftDisplayText("See [the plan](https://example.com) and [1].")).toBe("See [the plan](https://example.com) and [1].");
});
it("hides a section tag, whole or half-streamed, from a draft heading", () => {
  expect(draftDisplayText("## Quy trình nói gì {#process}\nCần báo trước.")).toBe("## Quy trình nói gì\nCần báo trước.");
  expect(draftDisplayText("## Các ca tương tự {#ca")).toBe("## Các ca tương tự");
});
