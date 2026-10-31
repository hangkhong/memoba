import { z } from "zod";
export const eventSchema = z.object({ stage: z.enum(["intake", "planning", "retrieval", "context", "reasoning", "validation", "completion", "tool"]), state: z.enum(["started", "completed", "failed"]), at: z.iso.datetime({ offset: true }), tool: z.enum(["search_knowledge", "search_cases", "read_case", "read_document", "expand_relations"]).optional(), count: z.number().int().nonnegative().optional(), code: z.string().optional() });
export type AnalysisEvent = z.infer<typeof eventSchema>;
export const terminalSchema = z.enum(["complete", "gap_report", "failed", "cancelled", "timed_out"]);
export type Terminal = z.infer<typeof terminalSchema>;
