import { describe, expect, it } from "vitest";
import { splitDocument, type SplitLimits } from "./split";

// Small seeded generator so a failing case replays without a property-testing dependency.
function random(seed: number) { let state = seed; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; }; }
function pick<T>(next: () => number, items: readonly T[]): T { return items[Math.floor(next() * items.length)] as T; }
const words = ["rollback", "notice", "customer", "release", "approve", "invoice", "owner", "deploy", "refund", "window"];
function sentence(next: () => number, count = 3 + Math.floor(next() * 12)) { return Array.from({ length: count }, () => pick(next, words)).join(" "); }
function fragment(next: () => number): string {
  switch (Math.floor(next() * 9)) {
    case 0: return `${"#".repeat(1 + Math.floor(next() * 4))} ${sentence(next, 2)}`;
    case 1: return sentence(next);
    case 2: return Array.from({ length: 1 + Math.floor(next() * 3) }, () => sentence(next)).join("\n");
    case 3: return Array.from({ length: 2 + Math.floor(next() * 5) }, (_, i) => `${i + 1}. ${sentence(next)}${next() < 0.3 ? `\n   - ${sentence(next)}` : ""}${next() < 0.15 ? `\n\n   ${sentence(next)}` : ""}`).join("\n");
    case 4: return Array.from({ length: 2 + Math.floor(next() * 5) }, () => `- ${sentence(next)}${next() < 0.2 ? "\n  continued here" : ""}`).join("\n");
    case 5: return `| a | b |\n| - | - |\n${Array.from({ length: 1 + Math.floor(next() * 4) }, () => `| ${pick(next, words)} | ${pick(next, words)} |`).join("\n")}`;
    case 6: return `\`\`\`\n# not a heading\n${sentence(next)}\n\n${sentence(next)}\n\`\`\``;
    case 7: return "";
    default: return `> ${sentence(next)}`;
  }
}
const nonBlank = (text: string) => text.replace(/\r\n?/g, "\n").split("\n").filter((line) => /\S/.test(line));

describe("splitDocument", () => {
  it("keeps every non-blank source line exactly once and in order", () => {
    const limits: SplitLimits = { sectionChars: 160, blockChars: 4000 };
    let checked = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const next = random(seed);
      const source = Array.from({ length: 2 + Math.floor(next() * 14) }, () => fragment(next)).join(next() < 0.5 ? "\n\n" : "\n");
      if (!/\S/.test(source)) continue;
      const result = splitDocument("Doc", source, limits);
      if (result.kind === "invalid") { expect(result.errors.every((error) => error.code !== "EMPTY"), `seed ${seed}`).toBe(true); continue; }
      checked++;
      const sections = result.blocks.flatMap((block) => block.sections);
      expect(sections.flatMap((section) => nonBlank(section.text)), `seed ${seed}`).toEqual(nonBlank(source));
      for (const section of sections) expect(section.text.length, `seed ${seed}`).toBeLessThanOrEqual(limits.sectionChars);
      expect(result.blocks.map((block) => block.index)).toEqual(result.blocks.map((_, i) => i + 1));
      expect(result.blocks.flatMap((block) => nonBlank(block.text)), `seed ${seed}`).toEqual(nonBlank(source));
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("splits at the shallowest heading level that occurs twice and keeps the intro as its own block", () => {
    const result = splitDocument("Release", "# Release\n\nWho this applies to.\n\n## Steps\n\n1. Build\n2. Ship\n\n### Detail\n\nMore.\n\n## Rollback\n\nRevert it.");
    if (result.kind !== "ok") throw new Error("Expected blocks");
    expect(result.blocks.map((block) => block.heading)).toEqual(["Overview", "Steps", "Rollback"]);
    expect(result.blocks[1]?.text).toContain("### Detail");
    expect(result.blocks[2]?.headingPath).toEqual(["Rollback"]);
  });

  it("treats a document with no repeated heading level as one block", () => {
    const result = splitDocument("Policy", "Intro text.\n\n# Only heading\n\nBody.");
    if (result.kind !== "ok") throw new Error("Expected blocks");
    expect(result.blocks).toHaveLength(1);
  });

  it("ignores heading-like lines inside code fences", () => {
    const result = splitDocument("Doc", "## One\n\n```\n## fake\n\n## fake two\n```\n\n## Two\n\ntext");
    if (result.kind !== "ok") throw new Error("Expected blocks");
    expect(result.blocks.map((block) => block.heading)).toEqual(["One", "Two"]);
  });

  it("splits lists only between items and never inside an atom", () => {
    const items = Array.from({ length: 6 }, (_, i) => `${i + 1}. ${"step ".repeat(8).trim()}`).join("\n");
    const result = splitDocument("Doc", `## Steps\n\n${items}`, { sectionChars: 120, blockChars: 4000 });
    if (result.kind !== "ok") throw new Error("Expected blocks");
    const sections = result.blocks.flatMap((block) => block.sections);
    expect(sections.length).toBeGreaterThan(1);
    for (const section of sections) for (const line of nonBlank(section.text)) expect(line).toMatch(/^(## Steps|\d\. step)/);
  });

  it("rejects an oversized atom or block and names the heading", () => {
    const atom = splitDocument("Doc", `## Pricing\n\n${"word ".repeat(100)}\n\n## Other\n\nfine`, { sectionChars: 200, blockChars: 4000 });
    expect(atom).toMatchObject({ kind: "invalid", errors: [{ code: "SECTION_TOO_LONG", heading: "Pricing" }] });
    const block = splitDocument("Doc", `## Big\n\n${Array.from({ length: 5 }, () => "word ".repeat(30)).join("\n\n")}\n\n## Other\n\nfine`, { sectionChars: 200, blockChars: 400 });
    expect(block).toMatchObject({ kind: "invalid", errors: [{ code: "BLOCK_TOO_LONG", heading: "Big" }] });
    const intro = splitDocument("Doc", `${"word ".repeat(100)}\n\n## A\n\nx\n\n## B\n\ny`, { sectionChars: 200, blockChars: 4000 });
    expect(intro).toMatchObject({ kind: "invalid", errors: [{ heading: "the text before the first heading" }] });
  });

  it("rejects empty content", () => {
    expect(splitDocument("Doc", " \n\n")).toMatchObject({ kind: "invalid", errors: [{ code: "EMPTY" }] });
  });
});
