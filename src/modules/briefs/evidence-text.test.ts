import { expect, it } from "vitest";
import { dropMatchingHeading, plainPreview } from "./evidence-text";

it("drops a first heading that repeats the shown one, and only that", () => {
  expect(dropMatchingHeading("## Notice\n\nSend it **in writing**.", "Policy > Notice")).toBe("Send it **in writing**.");
  expect(dropMatchingHeading("## Other\n\nBody", "Notice")).toBe("## Other\n\nBody");
  expect(dropMatchingHeading("Body\n## Notice", "Notice")).toBe("Body\n## Notice");
  expect(dropMatchingHeading("## Notice", "Notice")).toBe("## Notice");
});
it("reduces Markdown to plain words", () => {
  expect(plainPreview("## Notice\n\n- Send **in writing**\n- See [policy](https://x.y)\n\n| a | b |\n| - | - |\n| 1 | 2 |")).toBe("Notice · Send in writing · See policy · a b · 1 2");
});
