import { tool } from "ai";
import { z } from "zod";
import { executionLimits, inputLimits } from "@/lib/contracts/limits";
import { sectionKeySchema, relationTypeSchema } from "@/modules/cases/schema";
import { purposeSchema } from "./schema";
import type { KnowledgeStore } from "@/modules/knowledge/service";
import type { EvidenceBundle, EvidenceItem, ToolResult } from "@/modules/knowledge/contracts";
import { buildEvidenceBundle } from "@/modules/knowledge/context";
import type { RunBudget } from "./harness";
import type { AnalysisEvent } from "./events";
export function analysisTools({ knowledge, budget, initial, emit }: { knowledge: KnowledgeStore; budget: RunBudget; initial: EvidenceBundle; emit: (event: AnalysisEvent) => Promise<void> }) {
  const disclosed = new Map(initial.items.map((item) => [item.evidenceId, item]));
  async function execute(name: "search_knowledge" | "read_case" | "expand_relations", operation: () => Promise<ToolResult>) {
    budget.consume("tool"); await emit({ stage: "tool", state: "started", tool: name, at: new Date().toISOString() });
    let result = await budget.run(operation);
    for (let retry = 0; result.kind === "error" && result.retryable && retry < executionLimits.transientRetries; retry++) { budget.consume("tool"); result = await budget.run(operation); }
    await emit({ stage: "tool", state: result.kind === "error" ? "failed" : "completed", tool: name, count: result.kind === "error" ? 0 : result.items.length, at: new Date().toISOString() });
    if (result.kind === "error" || result.kind === "empty") return result;
    const accepted: EvidenceItem[] = [];
    const alreadyProvided: string[] = [];
    for (const item of result.items) {
      if (disclosed.has(item.evidenceId)) { alreadyProvided.push(item.evidenceId); continue; }
      const next = [...disclosed.values(), item];
      const bundle = buildEvidenceBundle({ items: next });
      if (bundle.items.length === next.length && bundle.items.some((entry) => entry.evidenceId === item.evidenceId)) { disclosed.set(item.evidenceId, item); accepted.push(item); }
    }
    return { kind: accepted.length ? "success" : "empty", items: accepted, alreadyProvided, ...(accepted.length !== result.items.length ? { warning: "CONTEXT_LIMIT" } : {}) };
  }
  const tools = {
    search_knowledge: tool({ description: "Search active published case evidence. A failed search is an error, not missing evidence.", inputSchema: z.object({ query: z.string().min(1).max(inputLimits.text), purpose: purposeSchema, conceptIds: z.array(z.uuid()).max(inputLimits.concepts) }), execute: (input) => execute("search_knowledge", () => knowledge.search(input)) }),
    read_case: tool({ description: "Read permitted sections from a case, preserving the revision already used by this run.", inputSchema: z.object({ caseId: z.uuid(), sectionKeys: z.array(sectionKeySchema).max(executionLimits.contextSections) }), execute: (input) => execute("read_case", () => knowledge.read(input)) }),
    expand_relations: tool({ description: "Expand one hop through direct links and shared concepts. Relations are retrieval hints, not proof of applicability.", inputSchema: z.object({ seedIds: z.array(z.uuid()).min(1).max(executionLimits.candidateSections), relationTypes: z.array(relationTypeSchema).max(3) }), execute: (input) => execute("expand_relations", () => knowledge.expand(input)) }),
  };
  return { tools, evidence: () => buildEvidenceBundle({ items: [...disclosed.values()] }) };
}
