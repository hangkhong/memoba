import { describe, expect, it } from "vitest";
import { documentInputSchema } from "../../src/modules/documents/schema";
import { splitDocument } from "../../src/modules/documents/split";
import { currentVersion, demoDocuments } from "./documents";
import { demoCases } from "./corpus";

const today = new Date().toISOString().slice(0, 10);
describe("demo documents", () => {
  const all = demoDocuments.flatMap((document) => document.versions.map((version) => ({ slug: document.slug, ...version })));
  it("holds five documents whose every version is valid, splits cleanly, and took effect in the past", () => {
    expect(demoDocuments).toHaveLength(5);
    expect(new Set(demoDocuments.map((item) => item.slug)).size).toBe(5);
    expect(new Set(demoDocuments.map((item) => currentVersion(item).input.title)).size).toBe(5);
    for (const { slug, input, changeNote } of all) {
      expect(documentInputSchema.safeParse(input).success, `${slug} ${input.effectiveFrom}`).toBe(true);
      expect(input.effectiveFrom < today, `${slug} ${input.effectiveFrom}`).toBe(true);
      expect(changeNote.length, slug).toBeGreaterThan(10);
      expect(split(input), slug).toBe("ok");
    }
  });
  it("keeps one title per document and ascending effective dates", () => {
    for (const document of demoDocuments) {
      expect(new Set(document.versions.map((version) => version.input.title)).size, document.slug).toBe(1);
      const dates = document.versions.map((version) => version.input.effectiveFrom);
      expect(dates, document.slug).toEqual([...dates].sort());
      expect(new Set(dates).size, document.slug).toBe(dates.length);
    }
  });
  it("gives two or more documents a real version history and keeps data deletion at one version", () => {
    expect(demoDocuments.filter((document) => document.versions.length >= 2).length).toBeGreaterThanOrEqual(2);
    expect(demoDocuments.every((document) => document.versions.length <= 3)).toBe(true);
    expect(demoDocuments.find((document) => document.slug === "data-deletion")?.versions).toHaveLength(1);
  });
  it("reads like a working document: current versions are long, structured and have several blocks", () => {
    for (const document of demoDocuments) {
      const { input } = currentVersion(document);
      expect(input.body.length, document.slug).toBeGreaterThanOrEqual(7000);
      expect(input.body.length, document.slug).toBeLessThanOrEqual(15000);
      const result = splitDocument(input.title, input.body);
      if (result.kind === "ok") expect(result.blocks.length, document.slug).toBeGreaterThanOrEqual(8);
      expect(input.body, document.slug).toMatch(/\n\| .* \|\n\|---/);
      expect(input.body, document.slug).not.toMatch(/\| *Version *\|/i);
    }
  });
  it("keeps the price policy at 90 days now, which conflicts with the 60-day Starter case, and shorter before", () => {
    const price = demoDocuments.find((document) => document.slug === "price-change-policy");
    expect(currentVersion(price!).input.body).toMatch(/at least 90 days before/);
    expect(price!.versions[0]!.input.body).toMatch(/at least 30 days/);
    const starter = demoCases.find((item) => item.slug === "starter-grandfathered")!;
    expect(starter.input.approach).toMatch(/60 days/);
  });
  it("is written in English and leaves cases alone", () => { expect(JSON.stringify(demoDocuments)).not.toMatch(/[à-ỹ]/i); });
});
function split(input: { title: string; body: string }) { return splitDocument(input.title, input.body).kind; }
