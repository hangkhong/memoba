import { executionLimits } from "@/lib/contracts/limits";
import type { NormalizedRequest } from "@/modules/analysis/schema";
import type { SectionKey } from "@/modules/cases/schema";
import type { CasePreview, DisclosedSource, ReadSection, RunToolResult, ToolResult } from "./contracts";
import { estimateEvidenceTokens } from "./context";
export type SearchInput = { query: string; purpose: "method" | "conditions" | "exceptions"; conceptIds: NormalizedRequest["conceptIds"] };
export type ReadInput = { caseId: string; sectionKeys: SectionKey[]; revisionId?: string };
export type ExpandInput = { seedIds: string[]; relationTypes: ("related_to" | "contrasts_with" | "supersedes")[] };
export type KnowledgeStore = { search: (input: SearchInput) => Promise<ToolResult>; read: (input: ReadInput) => Promise<ToolResult>; expand: (input: ExpandInput) => Promise<ToolResult> };

// Candidate previews and disclosed sources have different citation privileges.
export function createRunKnowledge(store: KnowledgeStore, runId: string) {
  const pinned = new Map<string, string>();
  const previews = new Set<string>();
  const disclosed = new Map<string, DisclosedSource>();
  let previewTokens = 0;
  const contextKeys: SectionKey[] = ["problem", "context", "constraints", "approach", "observedOutcome", "lessons"];
  const key = (item: DisclosedSource["evidence"]) => `${item.revisionId}:${item.sectionKey}`;

  async function searchCases(query: string): Promise<RunToolResult<CasePreview>> {
    const result = await store.search({ query, purpose: "method", conceptIds: [] });
    if (result.kind === "error" || result.kind === "empty") return result;
    const groups = new Map<string, CasePreview>();
    const previous: string[] = [];
    let reason: Extract<RunToolResult<CasePreview>, { kind: "partial" }>["reason"] | undefined = result.kind === "partial" ? result.code : undefined;
    for (const item of result.items) {
      const itemKey = key(item);
      const existingRevision = pinned.get(item.caseId);
      if (existingRevision && existingRevision !== item.revisionId) { reason = "PINNED_REVISION_CONFLICT"; continue; }
      if (previews.has(itemKey)) { previous.push(itemKey); continue; }
      if (previews.size >= executionLimits.candidateSections) { reason = "CANDIDATE_LIMIT"; continue; }
      const excerpt = item.excerpt.slice(0, executionLimits.previewExcerptChars);
      const section = { sectionKey: item.sectionKey, excerpt, truncated: excerpt.length < item.excerpt.length };
      const itemTokens = Math.ceil(new TextEncoder().encode(JSON.stringify({ caseId: item.caseId, revisionId: item.revisionId, title: item.caseTitle, outcome: item.outcome, section })).byteLength / 3);
      if (previewTokens + itemTokens > executionLimits.previewTokens || previewTokens + itemTokens + estimateEvidenceTokens([...disclosed.values()].map((entry) => entry.evidence)) > executionLimits.contextTokens) { reason = "CONTEXT_LIMIT"; continue; }
      previewTokens += itemTokens;
      pinned.set(item.caseId, item.revisionId);
      previews.add(itemKey);
      let group = groups.get(item.caseId);
      if (!group) {
        group = { caseId: item.caseId, revisionId: item.revisionId, title: item.caseTitle, outcome: item.outcome, sections: [] };
        groups.set(item.caseId, group);
      }
      group.sections.push(section);
    }
    const items = [...groups.values()];
    if (reason) return { kind: "partial", items, reason };
    if (!items.length) return { kind: "no_progress", alreadyRead: previous };
    return { kind: "success", items };
  }

  async function readCase(caseId: string, sectionKeys: SectionKey[]): Promise<RunToolResult<ReadSection>> {
    const revisionId = pinned.get(caseId);
    const requested = [...new Set([...sectionKeys, ...contextKeys])];
    const result = await store.read({ caseId, sectionKeys: requested, ...(revisionId ? { revisionId } : {}) });
    if (result.kind === "error") return result;
    if (result.kind === "empty") return revisionId ? { kind: "partial", items: [], reason: "SOURCE_UNAVAILABLE" } : result;
    const items: ReadSection[] = [];
    const alreadyRead: string[] = [];
    let reason: Extract<RunToolResult<ReadSection>, { kind: "partial" }>["reason"] | undefined = result.kind === "partial" ? result.code : undefined;
    for (const item of [...result.items].sort((a, b) => {
      const aIndex = contextKeys.indexOf(a.sectionKey); const bIndex = contextKeys.indexOf(b.sectionKey);
      return (aIndex < 0 ? contextKeys.length : aIndex) - (bIndex < 0 ? contextKeys.length : bIndex);
    })) {
      const existingRevision = pinned.get(caseId);
      if (item.caseId !== caseId || (existingRevision && item.revisionId !== existingRevision)) { reason = "PINNED_REVISION_CONFLICT"; continue; }
      const itemKey = key(item);
      const previous = disclosed.get(itemKey);
      if (previous) { alreadyRead.push(previous.marker); continue; }
      const all = [...disclosed.values()].map((entry) => entry.evidence);
      if (all.length >= executionLimits.contextSections || previewTokens + estimateEvidenceTokens([...all, item]) > executionLimits.contextTokens) { reason = "CONTEXT_LIMIT"; continue; }
      pinned.set(caseId, item.revisionId);
      const marker = `[S:${runId}:${disclosed.size + 1}]`;
      disclosed.set(itemKey, { marker, evidence: item });
      items.push({ marker, caseId: item.caseId, revisionId: item.revisionId, title: item.caseTitle, outcome: item.outcome, sectionKey: item.sectionKey, text: item.excerpt });
    }
    if (reason) return { kind: "partial", items, reason };
    if (!items.length) return { kind: "no_progress", alreadyRead };
    return { kind: "success", items };
  }

  return { searchCases, readCase, disclosed: () => [...disclosed.values()] };
}
