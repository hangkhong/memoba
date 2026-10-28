import { z } from "zod";
import { inputLimits } from "../../lib/contracts/limits.ts";

export const templateSchema = z.enum(["product_delivery", "cs_operations"]);
export const outcomeSchema = z.enum(["achieved", "not_achieved", "unknown"]);
export const conceptTypeSchema = z.enum(["problem_type", "system", "approach", "constraint"]);
export const relationTypeSchema = z.enum(["related_to", "contrasts_with", "supersedes"]);
export const sourceSchema = z.object({ label: z.string().trim().regex(/\S/, "Enter non-empty text.").max(inputLimits.title), url: z.url().regex(/^https?:\/\//i) }).strict();
const text = z.string().trim().regex(/\S/, "Enter non-empty text.").max(inputLimits.text);
const core = {
  title: z.string().trim().regex(/\S/, "Enter non-empty text.").max(inputLimits.title),
  problem: text, context: text, constraints: text, approach: text,
  outcome: outcomeSchema, observedOutcome: text, lessons: text,
  sources: z.array(sourceSchema).max(12),
  conceptIds: z.array(z.uuid()).max(inputLimits.concepts).refine((values) => new Set(values).size === values.length, "Select each concept once."),
};
export const caseInputSchema = z.discriminatedUnion("template", [
  z.object({ ...core, template: z.literal("product_delivery"), deliverable: text, changeScope: text, deploymentConditions: text }).strict(),
  z.object({ ...core, template: z.literal("cs_operations"), customerImpact: text, handlingConditions: text, escalationNotes: text }).strict(),
]);
export type CaseInput = z.infer<typeof caseInputSchema>;
export const sectionKeySchema = z.enum(["problem", "context", "constraints", "approach", "observedOutcome", "lessons", "deliverable", "changeScope", "deploymentConditions", "customerImpact", "handlingConditions", "escalationNotes"]);
export type SectionKey = z.infer<typeof sectionKeySchema>;
