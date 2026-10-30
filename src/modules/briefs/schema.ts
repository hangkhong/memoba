import { z } from "zod";
import { executionLimits, inputLimits } from "../../lib/contracts/limits.ts";
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
// Computed by the app from the run's tool results; the model does not write it.
export const answerCoverageSchema = z.object({
  searched: z.boolean(),
  previewed: z.number().int().nonnegative(),
  read: z.number().int().nonnegative(),
  searchFailed: z.boolean(),
  unreadTitles: z.array(z.string().max(200)).max(10),
  // Same order as unreadTitles; absent on answers saved before cases were linked.
  unreadCaseIds: z.array(z.uuid()).max(10).optional(),
}).strict();
export type AnswerCoverage = z.infer<typeof answerCoverageSchema>;
export const textAnswerSchema = z.object({
  version: z.literal(2),
  text: z.string().regex(/\S/).max(20_000),
  citations: z.array(z.object({
    marker: z.string().regex(/^\[S:[0-9a-f-]{36}:[1-9][0-9]*\]$/),
    evidenceId: z.uuid(),
  }).strict()).max(executionLimits.contextSections),
  coverage: answerCoverageSchema.optional(),
}).strict();
export const storedAnswerSchema = z.union([draftBriefSchema, textAnswerSchema]);
export type TextAnswer = z.infer<typeof textAnswerSchema>;
export type StoredAnswer = z.infer<typeof storedAnswerSchema>;
