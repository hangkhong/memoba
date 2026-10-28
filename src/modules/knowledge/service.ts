import { executionLimits } from "@/lib/contracts/limits";
import type { NormalizedRequest } from "@/modules/analysis/schema";
import type { SectionKey } from "@/modules/cases/schema";
import type { EvidenceRegistry } from "./context";
import type { ToolResult } from "./contracts";
export type SearchInput = { query: string; purpose: "method" | "conditions" | "exceptions"; conceptIds: NormalizedRequest["conceptIds"] };
export type ReadInput = { caseId: string; sectionKeys: SectionKey[]; revisionId?: string };
export type ExpandInput = { seedIds: string[]; relationTypes: ("related_to" | "contrasts_with" | "supersedes")[] };
export type KnowledgeStore = { search: (input: SearchInput) => Promise<ToolResult>; read: (input: ReadInput) => Promise<ToolResult>; expand: (input: ExpandInput) => Promise<ToolResult> };
export function createKnowledgeService(store: KnowledgeStore, registry: EvidenceRegistry): KnowledgeStore {
  const depths = new Map<string, number>(registry.items().map((item) => [item.caseId, 0]));
  const expanded = new Set<string>();
  async function register(result: ToolResult, depth = 0): Promise<ToolResult> {
    if (result.kind === "error" || result.kind === "empty") return result;
    const items = [];
    let limited = false;
    for (const item of result.items) {
      const registration = registry.register(item);
      if (registration.kind === "registered" || registration.kind === "duplicate") { items.push(registration.item); if (!depths.has(item.caseId)) depths.set(item.caseId, depth); }
      if (registration.kind === "limit") limited = true;
    }
    if (!items.length) return { kind: "empty", items: [] };
    return limited ? { kind: "partial", items, code: "CANDIDATE_LIMIT", retryable: false } : { kind: "success", items };
  }
  return {
    search: async (input) => register(await store.search(input)),
    read: async (input) => { const pinned = registry.items().find((item) => item.caseId === input.caseId); return register(await store.read({ ...input, revisionId: pinned?.revisionId ?? input.revisionId })); },
    expand: async (input) => {
      if (input.seedIds.some((id) => !depths.has(id))) return { kind: "error", code: "ACCESS_DENIED", retryable: false };
      const seeds = input.seedIds.filter((id) => (depths.get(id) ?? Infinity) < executionLimits.relationDepth && !expanded.has(id));
      if (!seeds.length) return { kind: "empty", items: [] };
      const result = await store.expand({ ...input, seedIds: seeds });
      if (result.kind !== "error") seeds.forEach((id) => expanded.add(id));
      return register(result, executionLimits.relationDepth);
    },
  };
}
