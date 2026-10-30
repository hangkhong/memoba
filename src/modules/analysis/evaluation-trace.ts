import type { SectionKey } from "@/modules/cases/schema";

export type EvaluationTraceEvent =
  | { kind: "tool_call"; callId: string; name: "search_cases"; input: { query: string } }
  | { kind: "tool_call"; callId: string; name: "read_case"; input: { caseIds: string[]; sectionKeys: SectionKey[] } }
  | { kind: "tool_result"; callId: string; result: string; reason: string | null; itemCount: number | null; caseIds: string[]; alreadyRead: string[] }
  | { kind: "model_sources"; sources: { marker: string; evidenceId: string; caseId: string; revisionId: string; sectionKey: SectionKey }[] }
  | { kind: "validation"; result: "valid" | "invalid"; code: string | null }
  | { kind: "correction"; state: "started" | "completed" };

// Only an explicitly supplied in-process observer receives these events.
export type EvaluationTrace = (event: EvaluationTraceEvent) => void;
