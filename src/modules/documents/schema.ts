import { z } from "zod";
import { inputLimits } from "../../lib/contracts/limits.ts";
import { sourceSchema } from "../cases/schema.ts";
import { splitDocument } from "./split.ts";

export const documentTypeSchema = z.enum(["policy", "procedure", "guideline"]);
export const documentAreaSchema = z.enum(["Product", "Engineering", "Operations", "Finance", "Legal", "People"]);
const text = z.string().trim().regex(/\S/, "Enter non-empty text.");
// Owned by the schema, enforced again in SQL by the contract generated from it (npm run db:contracts).
export const documentContentSchema = z.object({
  title: text.max(inputLimits.title),
  description: text.max(inputLimits.documentDescription),
  body: text.max(inputLimits.documentBody),
  type: documentTypeSchema,
  area: documentAreaSchema,
  owner: text.max(inputLimits.title),
  effectiveFrom: z.iso.date(),
  sources: z.array(sourceSchema).max(12).default([]),
}).strict();
// The splitter rejects what cannot be indexed, so the form preview and the server give the same answer.
export const documentInputSchema = documentContentSchema.superRefine((value, ctx) => {
  const result = splitDocument(value.title, value.body);
  if (result.kind === "invalid") for (const error of result.errors) ctx.addIssue({ code: "custom", path: ["body"], message: error.message });
});
export type DocumentInput = z.infer<typeof documentContentSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type DocumentArea = z.infer<typeof documentAreaSchema>;
export const savedDocumentSchema = z.object({ documentId: z.uuid(), revisionId: z.uuid(), status: z.enum(["published", "unchanged"]) });
export type SavedDocument = z.infer<typeof savedDocumentSchema>;
