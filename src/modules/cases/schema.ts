import { z } from "zod";
import { inputLimits } from "../../lib/contracts/limits.ts";

export const templateSchema = z.enum(["product_delivery", "cs_operations"]);
export const outcomeSchema = z.enum(["achieved", "not_achieved", "unknown"]);
export const conceptTypeSchema = z.enum(["problem_type", "system", "approach", "constraint"]);
export const relationTypeSchema = z.enum(["related_to", "contrasts_with", "supersedes"]);
export const sourceSchema = z.object({ label: z.string().trim().regex(/\S/, "Enter non-empty text.").max(inputLimits.title), url: z.url().regex(/^https?:\/\//i) }).strict();
const text = z.string().trim().regex(/\S/, "Enter non-empty text.").max(inputLimits.text);
const optionalText = z.string().trim().max(inputLimits.text).default("");
const core = {
  title: z.string().trim().regex(/\S/, "Enter non-empty text.").max(inputLimits.title),
  problem: text, context: text, constraints: optionalText, approach: text,
  outcome: outcomeSchema, observedOutcome: optionalText, lessons: optionalText,
  sources: z.array(sourceSchema).max(12).default([]),
  conceptIds: z.array(z.uuid()).max(inputLimits.concepts).refine((values) => new Set(values).size === values.length, "Select each concept once.").default([]),
};
export const caseInputSchema = z.discriminatedUnion("template", [
  z.object({ ...core, template: z.literal("product_delivery"), deliverable: optionalText, changeScope: optionalText, deploymentConditions: optionalText }).strict(),
  z.object({ ...core, template: z.literal("cs_operations"), customerImpact: optionalText, handlingConditions: optionalText, escalationNotes: optionalText }).strict(),
]).refine((value) => value.outcome === "unknown" || /\S/.test(value.observedOutcome), { path: ["observedOutcome"], message: "Describe the known outcome." });
export type CaseInput = z.infer<typeof caseInputSchema>;
export const sectionKeySchema = z.enum(["problem", "context", "constraints", "approach", "observedOutcome", "lessons", "deliverable", "changeScope", "deploymentConditions", "customerImpact", "handlingConditions", "escalationNotes"]);
export type SectionKey = z.infer<typeof sectionKeySchema>;
