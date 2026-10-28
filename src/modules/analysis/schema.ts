import { z } from "zod";
import { templateSchema } from "../cases/schema.ts";
import { executionLimits, inputLimits } from "../../lib/contracts/limits.ts";

const text = z.string().trim().regex(/\S/, "Enter non-empty text.").max(inputLimits.text);
export const purposeSchema = z.enum(["method", "conditions", "exceptions"]);
export const requestSchema = z.object({
  template: templateSchema,
  version: z.literal(1),
  objective: text,
  context: text,
  hardConstraints: z.array(z.object({ kind: z.enum(["requirement", "prohibition"]), text }).strict()).max(inputLimits.hardConstraints),
  conceptIds: z.array(z.uuid()).max(inputLimits.concepts),
  unknowns: z.string().trim().max(inputLimits.text),
}).strict();
export type NormalizedRequest = z.infer<typeof requestSchema>;
export const planQueriesSchema = z.object({ queries: z.array(z.object({ purpose: purposeSchema, query: text }).strict()).min(1).max(executionLimits.planQueries) }).strict();
export type PlanQueries = z.infer<typeof planQueriesSchema>;
export type RequestPlan = { request: NormalizedRequest; queries: PlanQueries["queries"] };
