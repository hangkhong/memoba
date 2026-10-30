import { z } from "zod";
import { purposeSchema } from "../analysis/schema.ts";
import { outcomeSchema, sectionKeySchema, sourceSchema } from "../cases/schema.ts";

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
  recordedAt: z.iso.datetime({ offset: true }),
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


export type CasePreview = {
  caseId: EvidenceItem["caseId"];
  revisionId: EvidenceItem["revisionId"];
  title: string;
  outcome: EvidenceItem["outcome"];
  sections: { sectionKey: EvidenceItem["sectionKey"]; excerpt: string; truncated: boolean }[];
};
export type DisclosedSource = { marker: string; evidence: EvidenceItem };
export type ReadSection = { marker: string; caseId: EvidenceItem["caseId"]; revisionId: EvidenceItem["revisionId"]; title: string; outcome: EvidenceItem["outcome"]; sectionKey: EvidenceItem["sectionKey"]; text: string };
export type CaseHeader = {
  caseId: EvidenceItem["caseId"];
  revisionId: EvidenceItem["revisionId"];
  title: string;
  template?: "product_delivery" | "cs_operations";
  outcome: EvidenceItem["outcome"];
  // The marker is returned even when the text was already read earlier in the run.
  observedOutcome?: { marker: string; text?: string };
};
export type ReadResult =
  | { kind: "success"; cases: CaseHeader[]; items: ReadSection[] }
  | { kind: "partial"; cases: CaseHeader[]; items: ReadSection[]; reason: "CONTEXT_LIMIT" | "SOURCE_UNAVAILABLE" | "PINNED_REVISION_CONFLICT" }
  | { kind: "empty"; items: [] }
  | { kind: "no_progress"; alreadyRead: string[] }
  | { kind: "error"; code: Extract<ToolResult, { kind: "error" }>["code"]; retryable: boolean };
export type RunToolResult<T> =
  | { kind: "success"; items: T[] }
  | { kind: "empty"; items: [] }
  | { kind: "partial"; items: T[]; reason: "CANDIDATE_LIMIT" | "CONTEXT_LIMIT" | "SOURCE_UNAVAILABLE" | "PINNED_REVISION_CONFLICT" }
  | { kind: "no_progress"; alreadyRead: string[] }
  | { kind: "error"; code: Extract<ToolResult, { kind: "error" }>["code"]; retryable: boolean };
