import { executionLimits } from "@/lib/contracts/limits";
import type { NormalizedRequest } from "@/modules/analysis/schema";
import type { SectionKey } from "@/modules/cases/schema";
import type { CaseHeader, CasePreview, DisclosedSource, EvidenceItem, ReadResult, ReadSection, RunToolResult, ToolResult } from "./contracts";
import { estimateEvidenceTokens } from "./context";
export type SearchInput = { query: string; purpose: "method" | "conditions" | "exceptions"; conceptIds: NormalizedRequest["conceptIds"] };
export type ReadInput = { caseId: string; sectionKeys: SectionKey[]; revisionId?: string };
export type ExpandInput = { seedIds: string[]; relationTypes: ("related_to" | "contrasts_with" | "supersedes")[] };
export type KnowledgeStore = { search: (input: SearchInput) => Promise<ToolResult>; read: (input: ReadInput) => Promise<ToolResult>; expand: (input: ExpandInput) => Promise<ToolResult>; template?: (revisionId: string) => Promise<CaseHeader["template"]> };

// Candidate previews and disclosed sources have different citation privileges.
export function createRunKnowledge(store: KnowledgeStore, runId: string) {
  const pinned = new Map<string, string>();
  const previews = new Set<string>();
  const disclosed = new Map<string, DisclosedSource>();
  let previewTokens = 0;
  const sectionPriority: SectionKey[] = ["approach", "observedOutcome", "problem", "context", "constraints", "lessons", "deliverable", "changeScope", "deploymentConditions", "customerImpact", "handlingConditions", "escalationNotes"];
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

  // Lowest-priority sections are dropped first when the context budget runs out.
  async function readCases(caseIds: string[], sectionKeys: SectionKey[]): Promise<ReadResult> {
    const requested = [...new Set([...(sectionKeys.length ? sectionKeys : sectionPriority), "observedOutcome" as const])];
    const fetched: { caseId: string; items: EvidenceItem[] }[] = [];
    const errors: Extract<ReadResult, { kind: "error" }>[] = [];
    let unavailable = false; let unavailablePinned = false;
    let reason: Extract<ReadResult, { kind: "partial" }>["reason"] | undefined;
    for (const caseId of new Set(caseIds)) {
      const revisionId = pinned.get(caseId);
      const result = await store.read({ caseId, sectionKeys: requested, ...(revisionId ? { revisionId } : {}) });
      if (result.kind === "error") { errors.push(result); continue; }
      if (result.kind === "empty") { unavailable = true; unavailablePinned ||= !!revisionId; continue; }
      fetched.push({ caseId, items: result.items });
    }
    if (!fetched.length) {
      if (errors[0]) return errors[0];
      return unavailablePinned ? { kind: "partial", items: [], cases: [], reason: "SOURCE_UNAVAILABLE" } : { kind: "empty", items: [] };
    }
    if (unavailable || errors.length) reason = "SOURCE_UNAVAILABLE";
    const candidates: { caseId: string; item: EvidenceItem }[] = [];
    const headers = new Map<string, CaseHeader>();
    for (const { caseId, items: found } of fetched) {
      for (const item of found) {
        const existingRevision = pinned.get(caseId);
        if (item.caseId !== caseId || (existingRevision && item.revisionId !== existingRevision)) { reason = "PINNED_REVISION_CONFLICT"; continue; }
        if (!headers.has(caseId)) headers.set(caseId, { caseId: item.caseId, revisionId: item.revisionId, title: item.caseTitle, outcome: item.outcome });
        candidates.push({ caseId, item });
      }
    }
    const order = [...headers.keys()];
    const outcomes = order.flatMap((caseId) => candidates.filter((entry) => entry.caseId === caseId && entry.item.sectionKey === "observedOutcome"));
    const rest = candidates.filter((entry) => entry.item.sectionKey !== "observedOutcome").sort((a, b) => sectionPriority.indexOf(a.item.sectionKey) - sectionPriority.indexOf(b.item.sectionKey) || order.indexOf(a.caseId) - order.indexOf(b.caseId));
    const items: ReadSection[] = [];
    const alreadyRead: string[] = [];
    let added = 0;
    for (const { caseId, item } of [...outcomes, ...rest]) {
      const itemKey = key(item);
      const previous = disclosed.get(itemKey);
      let marker: string; let fresh = false;
      if (previous) { alreadyRead.push(previous.marker); marker = previous.marker; }
      else {
        const all = [...disclosed.values()].map((entry) => entry.evidence);
        if (all.length >= executionLimits.contextSections || previewTokens + estimateEvidenceTokens([...all, item]) > executionLimits.contextTokens) { reason = "CONTEXT_LIMIT"; break; }
        pinned.set(caseId, item.revisionId);
        marker = `[S:${runId}:${disclosed.size + 1}]`;
        disclosed.set(itemKey, { marker, evidence: item });
        fresh = true; added += 1;
      }
      const header = headers.get(caseId);
      if (item.sectionKey === "observedOutcome" && header) header.observedOutcome = fresh ? { marker, text: item.excerpt } : { marker };
      else if (fresh) items.push({ marker, caseId: item.caseId, revisionId: item.revisionId, title: item.caseTitle, outcome: item.outcome, sectionKey: item.sectionKey, text: item.excerpt });
    }
    const cases = [...headers.values()];
    if (store.template) for (const header of cases) header.template = await store.template(header.revisionId);
    if (reason) return { kind: "partial", items, cases, reason };
    if (!added) return { kind: "no_progress", alreadyRead };
    return { kind: "success", items, cases };
  }

  return { searchCases, readCases, disclosed: () => [...disclosed.values()] };
}
