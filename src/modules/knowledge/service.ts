import { executionLimits } from "@/lib/contracts/limits";
import type { NormalizedRequest } from "@/modules/analysis/schema";
import type { SectionKey } from "@/modules/cases/schema";
import { isCaseEvidence, isDocumentEvidence, type CaseEvidence, type CaseHeader, type CasePreview, type DisclosedSource, type DocumentCard, type DocumentEvidence, type DocumentReadBlock, type DocumentReadResult, type DocumentSearchResult, type EvidenceItem, type HeldSource, type KnowledgeSearchResult, type SourceStanding, type ReadResult, type ReadSection, type RunToolResult, type ToolResult } from "./contracts";
import { estimateEvidenceTokens } from "./context";
import type { AnswerCoverage } from "@/modules/briefs/schema";
export type SearchInput = { query: string; purpose: "method" | "conditions" | "exceptions"; conceptIds: NormalizedRequest["conceptIds"] };
export type ReadInput = { caseId: string; sectionKeys: SectionKey[]; revisionId?: string };
export type ExpandInput = { seedIds: string[]; relationTypes: ("related_to" | "contrasts_with" | "supersedes")[] };
export type ReadDocumentInput = { documentId: string; blocks: number[]; revisionId?: string };
export type DocumentReadStoreResult = { kind: "success"; items: DocumentEvidence[] } | { kind: "empty"; items: [] } | { kind: "error"; code: Extract<ToolResult, { kind: "error" }>["code"]; retryable: boolean };
// `search` embeds the query once and runs the case and document searches separately; one source failing leaves the other intact.
export type KnowledgeStore = {
  search: (input: SearchInput) => Promise<{ cases: ToolResult; documents: DocumentSearchResult }>;
  read: (input: ReadInput) => Promise<ToolResult>;
  readDocument: (input: ReadDocumentInput) => Promise<DocumentReadStoreResult>;
  expand: (input: ExpandInput) => Promise<ToolResult>;
  template?: (revisionId: string) => Promise<CaseHeader["template"]>;
  // Where each cited source stands now, by evidence ID. A source the store cannot find is left out.
  standing?: (items: EvidenceItem[]) => Promise<Map<string, SourceStanding>>;
};

type SearchState = "none" | "succeeded" | "failed_or_partial";
export type RunCoverage = { searchState: SearchState; previewed: { caseId: string; title: string }[]; readCaseIds: string[]; documents: { searchState: SearchState; previewedIds: string[]; readIds: string[] } };

// Saved with the answer. Read counts include any case read, even one search did not preview.
export function answerCoverage(coverage: RunCoverage): AnswerCoverage {
  const read = new Set(coverage.readCaseIds);
  const previewedIds = new Set(coverage.previewed.map((item) => item.caseId));
  return {
    searched: coverage.searchState !== "none",
    previewed: new Set([...previewedIds, ...read]).size,
    read: read.size,
    searchFailed: coverage.searchState === "failed_or_partial",
    unreadTitles: coverage.previewed.filter((item) => !read.has(item.caseId)).map((item) => item.title).slice(0, 10),
    documents: { searched: coverage.documents.searchState !== "none", previewed: new Set([...coverage.documents.previewedIds, ...coverage.documents.readIds]).size, read: new Set(coverage.documents.readIds).size, searchFailed: coverage.documents.searchState === "failed_or_partial" },
  };
}

// Code, not the model, decides which cited sources are still the current version. A failed check holds a source as `changed`, so it is read again instead of trusted.
export async function holdSources(store: KnowledgeStore, sources: DisclosedSource[]): Promise<HeldSource[]> {
  if (!sources.length) return [];
  let standing: Map<string, SourceStanding> | undefined;
  try { standing = await store.standing?.(sources.map((source) => source.evidence)); } catch { standing = undefined; }
  if (!store.standing) return [];
  return sources.flatMap((source) => {
    if (!standing) return [{ ...source, standing: "changed" as const }];
    const found = standing.get(source.evidence.evidenceId);
    return found ? [{ ...source, standing: found }] : [];
  });
}

// Candidate previews and disclosed sources have different citation privileges.
export function createRunKnowledge(store: KnowledgeStore, runId: string) {
  const pinned = new Map<string, string>();
  const previews = new Set<string>();
  const previewedCases = new Map<string, string>();
  const readIds = new Set<string>();
  let searchState: SearchState = "none";
  const disclosed = new Map<string, DisclosedSource>();
  let previewTokens = 0;
  // Documents have their own pins, preview pool and read pool, so they never spend case budget.
  const pinnedDocuments = new Map<string, string>();
  const previewedDocuments = new Set<string>();
  const readDocuments = new Set<string>();
  let documentSearchState: SearchState = "none";
  let documentPreviewTokens = 0;
  const caseEvidence = () => [...disclosed.values()].map((entry) => entry.evidence).filter(isCaseEvidence);
  const documentEvidence = () => [...disclosed.values()].map((entry) => entry.evidence).filter(isDocumentEvidence);
  const sectionPriority: SectionKey[] = ["approach", "observedOutcome", "problem", "context", "constraints", "lessons", "deliverable", "changeScope", "deploymentConditions", "customerImpact", "handlingConditions", "escalationNotes"];
  const key = (item: CaseEvidence) => `${item.revisionId}:${item.sectionKey}`;

  function casePreviews(result: ToolResult): RunToolResult<CasePreview> {
    if (result.kind === "error" || result.kind === "partial") searchState = "failed_or_partial";
    else if (searchState === "none") searchState = "succeeded";
    if (result.kind === "error" || result.kind === "empty") return result;
    for (const item of result.items) if (!previewedCases.has(item.caseId)) previewedCases.set(item.caseId, item.caseTitle);
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
      if (previewTokens + itemTokens > executionLimits.previewTokens || previewTokens + itemTokens + estimateEvidenceTokens(caseEvidence()) > executionLimits.contextTokens) { reason = "CONTEXT_LIMIT"; continue; }
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
    const fetched: { caseId: string; items: CaseEvidence[] }[] = [];
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
    const candidates: { caseId: string; item: CaseEvidence }[] = [];
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
      if (previous) { alreadyRead.push(previous.marker); marker = previous.marker; readIds.add(caseId); }
      else {
        const all = caseEvidence();
        if (all.length >= executionLimits.contextSections || previewTokens + estimateEvidenceTokens([...all, item]) > executionLimits.contextTokens) { reason = "CONTEXT_LIMIT"; break; }
        pinned.set(caseId, item.revisionId);
        marker = `[S:${runId}:${disclosed.size + 1}]`;
        disclosed.set(itemKey, { marker, evidence: item });
        fresh = true; added += 1; readIds.add(caseId);
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

  function documentCards(result: DocumentSearchResult): RunToolResult<DocumentCard> {
    if (result.kind === "error") { documentSearchState = "failed_or_partial"; return result; }
    if (documentSearchState === "none") documentSearchState = "succeeded";
    if (result.kind === "empty") return result;
    const cards: DocumentCard[] = [];
    let reason: Extract<RunToolResult<DocumentCard>, { kind: "partial" }>["reason"] | undefined;
    for (const card of result.items.slice(0, executionLimits.documentCandidates)) {
      const pinnedRevision = pinnedDocuments.get(card.documentId);
      if (pinnedRevision && pinnedRevision !== card.revisionId) { reason = "PINNED_REVISION_CONFLICT"; continue; }
      if (!previewedDocuments.has(card.documentId)) {
        const tokens = Math.ceil(new TextEncoder().encode(JSON.stringify(card)).byteLength / 3);
        if (documentPreviewTokens + tokens > executionLimits.documentPreviewTokens) { reason = "CONTEXT_LIMIT"; continue; }
        documentPreviewTokens += tokens; previewedDocuments.add(card.documentId); pinnedDocuments.set(card.documentId, card.revisionId);
      }
      cards.push(card);
    }
    if (reason) { documentSearchState = "failed_or_partial"; return { kind: "partial", items: cards, reason }; }
    return { kind: "success", items: cards };
  }

  // One query feeds both sources. Each keeps its own state, so a failed source is never read as absence.
  async function searchKnowledge(query: string): Promise<KnowledgeSearchResult> {
    const raw = await store.search({ query, purpose: "method", conceptIds: [] });
    const cases = casePreviews(raw.cases);
    const documents = documentCards(raw.documents);
    return { kind: overallKind(cases, documents), cases, documents };
  }

  // A block is delivered whole or listed in omittedBlocks; context never cuts inside one.
  async function readDocument(documentId: string, blocks: number[]): Promise<DocumentReadResult> {
    const pinnedRevision = pinnedDocuments.get(documentId);
    const result = await store.readDocument({ documentId, blocks, ...(pinnedRevision ? { revisionId: pinnedRevision } : {}) });
    if (result.kind === "error") return result;
    if (result.kind === "empty") return pinnedRevision ? { kind: "partial", document: null, blocks: [], omittedBlocks: [], reason: "SOURCE_UNAVAILABLE" } : { kind: "empty", items: [] };
    let reason: Extract<DocumentReadResult, { kind: "partial" }>["reason"] | undefined;
    const usable = result.items.filter((item) => { if (pinnedRevision && item.revisionId !== pinnedRevision) { reason = "PINNED_REVISION_CONFLICT"; return false; } return item.documentId === documentId; });
    const first = usable[0];
    if (!first) return { kind: "partial", document: null, blocks: [], omittedBlocks: [], reason: reason ?? "SOURCE_UNAVAILABLE" };
    pinnedDocuments.set(documentId, first.revisionId);
    const grouped = new Map<number, DocumentEvidence[]>();
    for (const item of usable) grouped.set(item.block, [...(grouped.get(item.block) ?? []), item]);
    const delivered: DocumentReadBlock[] = []; const omittedBlocks: number[] = []; const alreadyRead: string[] = [];
    let added = 0;
    for (const [block, sections] of [...grouped].sort(([a], [b]) => a - b)) {
      const fresh = sections.filter((section) => !disclosed.has(`doc:${section.sectionId}`));
      for (const section of sections) { const previous = disclosed.get(`doc:${section.sectionId}`); if (previous) { alreadyRead.push(previous.marker); readDocuments.add(documentId); } }
      if (!fresh.length) continue;
      const current = documentEvidence();
      if (current.length + fresh.length > executionLimits.documentContextSections || estimateEvidenceTokens([...current, ...fresh]) > executionLimits.documentContextTokens) { omittedBlocks.push(block); reason = "CONTEXT_LIMIT"; continue; }
      const entries = fresh.map((section) => { const marker = `[S:${runId}:${disclosed.size + 1}]`; disclosed.set(`doc:${section.sectionId}`, { marker, evidence: section }); return { marker, heading: section.heading, text: section.excerpt }; });
      added += entries.length; readDocuments.add(documentId);
      delivered.push({ block, heading: sections[0]?.heading.split(" > ")[0] ?? "", sections: entries });
    }
    const document = { documentId: first.documentId, revisionId: first.revisionId, version: first.version, documentTitle: first.documentTitle, type: first.type, area: first.area, owner: first.owner, effectiveFrom: first.effectiveFrom };
    if (reason) return { kind: "partial", document, blocks: delivered, omittedBlocks, reason };
    if (!added) return { kind: "no_progress", alreadyRead };
    return { kind: "success", document, blocks: delivered, omittedBlocks };
  }

  const coverage = (): RunCoverage => ({ searchState, previewed: [...previewedCases].map(([caseId, title]) => ({ caseId, title })), readCaseIds: [...readIds], documents: { searchState: documentSearchState, previewedIds: [...previewedDocuments], readIds: [...readDocuments] } });
  return { searchKnowledge, readCases, readDocument, coverage, disclosed: () => [...disclosed.values()] };
}

type SourceKind = RunToolResult<unknown>["kind"];
function overallKind(cases: { kind: SourceKind }, documents: { kind: SourceKind }): KnowledgeSearchResult["kind"] {
  const kinds = [cases.kind, documents.kind];
  if (kinds.every((kind) => kind === "error")) return "error";
  if (kinds.some((kind) => kind === "error" || kind === "partial")) return "partial";
  if (kinds.every((kind) => kind === "empty")) return "empty";
  return kinds.includes("success") ? "success" : "no_progress";
}
