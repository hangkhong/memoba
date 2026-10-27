import { z } from "zod";
import { purposeSchema } from "@/modules/analysis/schema";
import { outcomeSchema, sectionKeySchema, sourceSchema } from "@/modules/cases/schema";

export const evidenceSchema = z.object({
  evidenceId: z.string().min(1),
  caseId: z.uuid().brand<"CaseId">(),
  revisionId: z.uuid().brand<"RevisionId">(),
  sectionId: z.uuid().brand<"SectionId">(),
  sectionKey: sectionKeySchema,
  caseTitle: z.string().min(1),
  excerpt: z.string().min(1),
  outcome: outcomeSchema,
  authorId: z.uuid(),
  recordedAt: z.iso.datetime(),
  sources: z.array(sourceSchema),
  purpose: purposeSchema,
  retrievalReason: z.string().min(1),
});
export type EvidenceItem = z.infer<typeof evidenceSchema>;
export const toolResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("success"), items: z.array(evidenceSchema).min(1) }),
  z.object({ kind: z.literal("empty"), items: z.tuple([]) }),
  z.object({ kind: z.literal("partial"), items: z.array(evidenceSchema).min(1), code: z.enum(["CANDIDATE_LIMIT", "SOURCE_UNAVAILABLE"]), retryable: z.literal(false) }),
  z.object({ kind: z.literal("error"), code: z.enum(["UNAVAILABLE", "ACCESS_DENIED", "QUERY_FAILED", "INVALID_RESULT"]), retryable: z.boolean() }),
]);
export type ToolResult = z.infer<typeof toolResultSchema>;
export type EvidenceBundle = {
  items: EvidenceItem[];
  gaps: z.infer<typeof purposeSchema>[];
  warnings: ("CONTEXT_LIMIT" | "PINNED_REVISION_CONFLICT")[];
  estimatedTokens: number;
};
