import { z } from "zod";
import { inputLimits } from "../../lib/contracts/limits.ts";
import { sectionKeySchema } from "../cases/schema.ts";

export const referenceSchema = z.object({ evidenceId: z.string().min(1), caseId: z.uuid(), revisionId: z.uuid(), sectionKey: sectionKeySchema }).strict();
const claimBase = { text: z.string().trim().min(1).max(inputLimits.text), references: z.array(referenceSchema) };
export const claimSchema = z.union([
  z.object({ ...claimBase, kind: z.literal("observed"), references: z.array(referenceSchema).min(1) }).strict(),
  z.object({ ...claimBase, kind: z.literal("inference") }).strict(),
  z.object({ ...claimBase, kind: z.literal("proposal") }).strict(),
]);
export const draftBriefSchema = z.object({
  reusableApproach: z.array(claimSchema).min(1),
  adjustments: z.array(claimSchema),
  conflicts: z.array(claimSchema),
  unknowns: z.array(z.string().trim().min(1).max(inputLimits.text)),
  nextSteps: z.array(claimSchema).min(1),
}).strict();
export type DraftBrief = z.infer<typeof draftBriefSchema>;
