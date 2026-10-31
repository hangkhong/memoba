import { describe, expect, it } from "vitest";
import { documentInputSchema } from "../../src/modules/documents/schema";
import { splitDocument } from "../../src/modules/documents/split";
import { demoDocuments } from "./documents";

describe("demo documents", () => {
  const inputs = demoDocuments.map((item) => item.input);
  it("holds five valid documents that split into blocks", () => {
    expect(demoDocuments).toHaveLength(5);
    expect(new Set(demoDocuments.map((item) => item.slug)).size).toBe(5);
    expect(new Set(inputs.map((input) => input.title)).size).toBe(5);
    for (const input of inputs) {
      expect(documentInputSchema.safeParse(input).success, input.title).toBe(true);
      const split = splitDocument(input.title, input.body);
      expect(split.kind, input.title).toBe("ok");
      if (split.kind === "ok") expect(split.blocks.length, input.title).toBeGreaterThanOrEqual(4);
    }
  });
  it("covers every document type and states the 90-day notice that the Starter case did not meet", () => {
    expect(new Set(inputs.map((input) => input.type))).toEqual(new Set(["policy", "procedure", "guideline"]));
    expect(demoDocuments.find((item) => item.slug === "price-change-policy")?.input.body).toMatch(/at least 90 days/);
  });
  it("is written in English", () => { expect(JSON.stringify(demoDocuments)).not.toMatch(/[à-ỹ]/i); });
});
