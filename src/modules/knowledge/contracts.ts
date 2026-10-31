import { z } from "zod";
import { purposeSchema } from "../analysis/schema.ts";
import { outcomeSchema, sectionKeySchema, sourceSchema } from "../cases/schema.ts";
import { documentAreaSchema, documentTypeSchema } from "../documents/schema.ts";

// The case shape is frozen: saved answers hold it and old rows must keep parsing.
export const caseEvidenceSchema = z.object({
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
export type CaseEvidence = z.infer<typeof caseEvidenceSchema>;
// Normative text. It has no outcome: a document says what must happen, not what happened.
export const documentEvidenceSchema = z.object({
  source: z.literal("document"),
  evidenceId: z.string().min(1),
  documentId: z.uuid().brand<"DocumentId">(),
  revisionId: z.uuid().brand<"DocumentRevisionId">(),
  sectionId: z.uuid().brand<"DocumentSectionId">(),
  version: z.number().int().positive(),
  block: z.number().int().positive(),
  heading: z.string().min(1),
  documentTitle: z.string().min(1),
  type: documentTypeSchema,
  area: documentAreaSchema,
  owner: z.string().min(1),
  effectiveFrom: z.iso.date(),
  excerpt: z.string().min(1),
  authorId: z.uuid(),
  recordedAt: z.iso.datetime({ offset: true }),
  sources: z.array(sourceSchema),
});
export type DocumentEvidence = z.infer<typeof documentEvidenceSchema>;
export const evidenceSchema = z.union([caseEvidenceSchema, documentEvidenceSchema]);
export type EvidenceItem = z.infer<typeof evidenceSchema>;
export const isDocumentEvidence = (item: EvidenceItem): item is DocumentEvidence => "source" in item;
export const isCaseEvidence = (item: EvidenceItem): item is CaseEvidence => !("source" in item);
export const toolResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("success"), items: z.array(caseEvidenceSchema).min(1) }),
  z.object({ kind: z.literal("empty"), items: z.tuple([]) }),
  z.object({ kind: z.literal("partial"), items: z.array(caseEvidenceSchema).min(1), code: z.enum(["CANDIDATE_LIMIT", "SOURCE_UNAVAILABLE"]), retryable: z.literal(false) }),
  z.object({ kind: z.literal("error"), code: z.enum(["UNAVAILABLE", "ACCESS_DENIED", "QUERY_FAILED", "INVALID_RESULT"]), retryable: z.boolean() }),
]);
export type ToolResult = z.infer<typeof toolResultSchema>;

export const documentCardSchema = z.object({
  documentId: z.uuid(), revisionId: z.uuid(), version: z.number().int().positive(), title: z.string(), description: z.string(),
  type: documentTypeSchema, area: documentAreaSchema, owner: z.string(), effectiveFrom: z.iso.date(),
  outline: z.array(z.object({ block: z.number().int().positive(), heading: z.string(), chars: z.number().int().nonnegative() })),
  matchedHeadings: z.array(z.object({ block: z.number().int().positive(), heading: z.string() })),
});
// A search card is a preview: it cannot be cited, and the summary section behind it is never shown.
export type DocumentCard = z.infer<typeof documentCardSchema>;
export type DocumentSearchResult =
  | { kind: "success"; items: DocumentCard[] }
  | { kind: "empty"; items: [] }
  | { kind: "error"; code: Extract<ToolResult, { kind: "error" }>["code"]; retryable: boolean };
export type DocumentHeader = Pick<DocumentEvidence, "documentId" | "revisionId" | "version" | "documentTitle" | "type" | "area" | "owner" | "effectiveFrom">;
export type DocumentReadBlock = { block: number; heading: string; sections: { marker: string; heading: string; text: string }[] };
export type DocumentReadResult =
  | { kind: "success"; document: DocumentHeader; blocks: DocumentReadBlock[]; omittedBlocks: number[] }
  | { kind: "partial"; document: DocumentHeader | null; blocks: DocumentReadBlock[]; omittedBlocks: number[]; reason: "CONTEXT_LIMIT" | "SOURCE_UNAVAILABLE" | "PINNED_REVISION_CONFLICT" }
  | { kind: "empty"; items: [] }
  | { kind: "no_progress"; alreadyRead: string[] }
  | { kind: "error"; code: Extract<ToolResult, { kind: "error" }>["code"]; retryable: boolean };

export type CasePreview = {
  caseId: CaseEvidence["caseId"];
  revisionId: CaseEvidence["revisionId"];
  title: string;
  outcome: CaseEvidence["outcome"];
  sections: { sectionKey: CaseEvidence["sectionKey"]; excerpt: string; truncated: boolean }[];
};
export type DisclosedSource = { marker: string; evidence: EvidenceItem };
export type ReadSection = { marker: string; caseId: CaseEvidence["caseId"]; revisionId: CaseEvidence["revisionId"]; title: string; outcome: CaseEvidence["outcome"]; sectionKey: CaseEvidence["sectionKey"]; text: string };
export type CaseHeader = {
  caseId: CaseEvidence["caseId"];
  revisionId: CaseEvidence["revisionId"];
  title: string;
  template?: "product_delivery" | "cs_operations";
  outcome: CaseEvidence["outcome"];
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

// One embedding feeds two searches that settle separately; each source reports its own state.
export type KnowledgeSearchResult = {
  kind: "success" | "partial" | "empty" | "no_progress" | "error";
  cases: RunToolResult<CasePreview>;
  documents: RunToolResult<DocumentCard>;
};
