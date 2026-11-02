import type { SectionKey } from "@/modules/cases/schema";

export type EvaluationTraceEvent =
  | { kind: "tool_call"; callId: string; name: "search_knowledge"; input: { query: string } }
  | { kind: "tool_call"; callId: string; name: "read_case"; input: { caseIds: string[]; sectionKeys: SectionKey[] } }
  | { kind: "tool_call"; callId: string; name: "read_document"; input: { documentId: string; blocks: number[] } }
  | { kind: "tool_result"; callId: string; result: string; reason: string | null; itemCount: number | null; caseIds: string[]; documentIds: string[]; alreadyRead: string[]; sourceStates?: string }
  | { kind: "model_sources"; sources: { marker: string; evidenceId: string; caseId?: string; documentId?: string; revisionId: string; sectionKey?: SectionKey; block?: number }[] }
  | { kind: "validation"; result: "valid" | "invalid"; code: string | null; sectionTags?: number }
  | { kind: "correction"; state: "started" | "completed" };

// Only an explicitly supplied in-process observer receives these events.
export type EvaluationTrace = (event: EvaluationTraceEvent) => void;
