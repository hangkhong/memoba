import { z } from "zod";
import { inputLimits } from "@/lib/contracts/limits";
import { outcomeSchema, sectionKeySchema, templateSchema, type SectionKey } from "./schema";

export const draftRequestSchema = z.object({
  description: z.string().trim().min(1).max(inputLimits.importText),
  fileNames: z.array(z.string().max(200)).max(10).default([]),
});
export type DraftRequest = z.infer<typeof draftRequestSchema>;

// Plain strings and enums only: provider structured-output modes reject length and format keywords.
export const caseDraftSchema = z.object({
  template: templateSchema, title: z.string(), problem: z.string(), context: z.string(), constraints: z.string(), approach: z.string(),
  outcome: outcomeSchema, observedOutcome: z.string(), lessons: z.string(),
  deliverable: z.string(), changeScope: z.string(), deploymentConditions: z.string(),
  customerImpact: z.string(), handlingConditions: z.string(), escalationNotes: z.string(),
});

const shared = { title: z.string(), problem: z.string(), context: z.string(), constraints: z.string(), approach: z.string(), outcome: outcomeSchema, observedOutcome: z.string(), lessons: z.string(), sources: z.array(z.never()), conceptIds: z.array(z.never()) };
const usageSchema = z.object({ inputTokens: z.number().nullable(), outputTokens: z.number().nullable(), totalTokens: z.number().nullable() });
export const draftResponseSchema = z.object({
  kind: z.literal("draft"),
  draft: z.discriminatedUnion("template", [
    z.object({ ...shared, template: z.literal("product_delivery"), deliverable: z.string(), changeScope: z.string(), deploymentConditions: z.string() }),
    z.object({ ...shared, template: z.literal("cs_operations"), customerImpact: z.string(), handlingConditions: z.string(), escalationNotes: z.string() }),
  ]),
  missing: z.array(sectionKeySchema),
  usage: usageSchema,
});
export type CaseDraftValues = z.infer<typeof draftResponseSchema>["draft"];
export type DraftResult = z.infer<typeof draftResponseSchema> | { kind: "error"; code: "TIMED_OUT" | "INVALID_OUTPUT" | "PROVIDER_ERROR" };
export type { SectionKey };
