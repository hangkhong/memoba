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
// One day of slack covers time zones; the database repeats this check against UTC.
const latestEffective = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
function checkContent(value: { title: string; body: string; effectiveFrom: string }, ctx: z.RefinementCtx) {
  // The splitter rejects what cannot be indexed, so the form preview and the server give the same answer.
  const result = splitDocument(value.title, value.body);
  if (result.kind === "invalid") for (const error of result.errors) ctx.addIssue({ code: "custom", path: ["body"], message: error.message });
  if (value.effectiveFrom > latestEffective()) ctx.addIssue({ code: "custom", path: ["effectiveFrom"], message: "A version takes effect when it is published, so the date cannot be in the future." });
}
export const documentInputSchema = documentContentSchema.superRefine(checkContent);
// What a person submits: the content plus a note on what changed and why. The note is stored with the version, apart from the content.
const withNote = documentContentSchema.extend({ changeNote: z.string().trim().max(inputLimits.documentChangeNote, "Keep the note short.").default("") });
export const documentPublishSchema = withNote.superRefine(checkContent);
export function documentFormSchema(editing: boolean) {
  return withNote.superRefine((value, ctx) => { checkContent(value, ctx); if (editing && !value.changeNote) ctx.addIssue({ code: "custom", path: ["changeNote"], message: "Describe what changed and why." }); });
}
export type DocumentInput = z.infer<typeof documentContentSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type DocumentArea = z.infer<typeof documentAreaSchema>;
export const savedDocumentSchema = z.object({ documentId: z.uuid(), revisionId: z.uuid(), version: z.number().int().positive(), status: z.enum(["published", "unchanged"]) });
export type SavedDocument = z.infer<typeof savedDocumentSchema>;
