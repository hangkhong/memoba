import { describe, expect, it } from "vitest";
import { caseInputSchema } from "../../src/modules/cases/schema";
import { demoCases } from "./corpus";
import { demoPrompts } from "./prompts";

describe("demo corpus", () => {
  const inputs = demoCases.map((item) => item.input);
  it("contains valid cases for both templates", () => {
    expect(demoCases.length).toBeGreaterThanOrEqual(15);
    expect(demoCases.length).toBeLessThanOrEqual(25);
    for (const input of inputs) expect(caseInputSchema.safeParse(input).success, input.title).toBe(true);
    expect(new Set(inputs.map((input) => input.template))).toEqual(new Set(["product_delivery", "cs_operations"]));
    expect(new Set(inputs.map((input) => input.title)).size).toBe(inputs.length);
    expect(new Set(demoCases.map((item) => item.slug)).size).toBe(demoCases.length);
  });
  it("covers every outcome and cases whose owner left", () => {
    for (const outcome of ["achieved", "not_achieved", "unknown"] as const) expect(inputs.filter((input) => input.outcome === outcome).length).toBeGreaterThanOrEqual(3);
    expect(inputs.filter((input) => /owner left the company/i.test(input.context)).length).toBeGreaterThanOrEqual(2);
  });
  it("offers three English prompts under 400 characters", () => {
    expect(demoPrompts).toHaveLength(3);
    for (const prompt of demoPrompts) expect(prompt.message.length).toBeLessThan(400);
  });
  it("is written in English", () => {
    expect(JSON.stringify([demoCases, demoPrompts])).not.toMatch(/[à-ỹ]/i);
  });
});
