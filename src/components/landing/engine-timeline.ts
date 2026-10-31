/** Engine copy and geometry for the landing page. Codes and tool names follow docs/reference/system-contracts.md. */
export type NodeId = "q" | "admit" | "search" | "cp" | "dp" | "rc" | "rd" | "write" | "check" | "save";
export type EdgeId = `${NodeId}>${NodeId}`;
export type OutcomeId = "found" | "none" | "failed";
export type DocumentState = OutcomeId;

export type Note = { title: string; body: string; code?: string };

export type Run = {
  id: OutcomeId;
  label: string;
  /** The real search event code. */
  code: string;
  activity: string;
  /** Explains the search result at the search node. */
  searchTitle: string;
  searchBody: string;
  /** Nodes the token visits, in order. */
  path: NodeId[];
  /** Edges that recede once the path is chosen. */
  recedes: EdgeId[];
  /** Nodes that recede with them. */
  hidden: NodeId[];
  /** Edges drawn as failed once search is reached. */
  failedEdges: EdgeId[];
  documentState: DocumentState;
  /** Caption under the Documents node. */
  documentStatus: string;
  answerProcessText: string;
  /** Notes that replace the shared one for a node. */
  notes: Partial<Record<NodeId, Note>>;
};

export const casesFound = "19 found";

export const question = "What does our release process require, and how have our past launches gone?";

export const nodeText: Record<NodeId, readonly [label: string, sub: string]> = {
  q: ["Question", ""],
  admit: ["Admission", "membership, deadline"],
  search: ["search_knowledge", "two searches"],
  cp: ["Cases", ""],
  dp: ["Documents", ""],
  rc: ["read_case", "outcome first"],
  rd: ["read_document", "whole blocks"],
  write: ["Write", "own headings"],
  check: ["Check citations", "in this run"],
  save: ["Save", "answer, sources"],
};

export const links: readonly (readonly [NodeId, NodeId])[] = [
  ["q", "admit"], ["admit", "search"], ["search", "cp"], ["search", "dp"], ["cp", "rc"], ["dp", "rd"],
  ["rc", "write"], ["rc", "rd"], ["rd", "write"], ["write", "check"], ["check", "save"],
];

const shared: Partial<Record<NodeId, Note>> = {
  q: { title: "A person asks in plain language.", body: "The request carries no workspace choice. The server derives the user and workspace from the session." },
  admit: { title: "The server admits the run.", body: "It checks membership and quota, then writes one deadline that every model call, tool, and correction shares.", code: "stage: intake" },
  rc: { title: "It reads cases, outcome first.", body: "Each read is pinned to one revision. If the budget runs out, background drops before the outcome does.", code: "read_case · Read case details" },
  write: { title: "The model writes. Tools are gone.", body: "Process and cases go under separate headings, and any gap in practice is named on its own." },
  check: { title: "Every citation is checked.", body: "Each one must match a section read in this run, and access is rechecked. One correction is allowed inside the same deadline.", code: "stage: validation" },
  save: { title: "The run leaves a record.", body: "Answer, source snapshots, and coverage are saved. The record returns to the conversation, not to your cases: refresh reads it and never restarts the model." },
};

export const runs: readonly Run[] = [
  {
    id: "found", label: "Document found", code: "cases:found:19;documents:found:5", activity: "19 cases found · 5 documents found",
    searchTitle: "One embedding, two searches.",
    searchBody: "Each source settles on its own. Search results are only candidates, and can't be cited.",
    path: ["q", "admit", "search", "cp", "rc", "rd", "write", "check", "save"],
    recedes: ["rc>write"], hidden: [], failedEdges: [],
    documentState: "found", documentStatus: "5 found",
    answerProcessText: "Production release procedure, version 3, effective 2026-02-01, owner Platform Engineering.",
    notes: { rd: { title: "It reads the document.", body: "A block arrives whole or is listed as omitted, so a requirement is never cut in half. Documents have their own budget.", code: "read_document · Read process document details" } },
  },
  {
    id: "none", label: "Searched, nothing found", code: "cases:found:19;documents:none:0", activity: "19 cases found · no documents matched",
    searchTitle: "Both searches finished. One came back empty.",
    searchBody: "The document search worked and returned nothing relevant. That is a real result, so the system takes the short path.",
    path: ["q", "admit", "search", "cp", "rc", "write", "check", "save"],
    recedes: ["rc>rd", "rd>write", "dp>rd"], hidden: ["rd"], failedEdges: [],
    documentState: "none", documentStatus: "none matched",
    answerProcessText: "The answer says no matching process document was found, and goes on from the cases.",
    notes: {},
  },
  {
    id: "failed", label: "Could not search", code: "cases:found:19;documents:failed:0", activity: "19 cases found · documents could not be searched",
    searchTitle: "One search failed. The other stands.",
    searchBody: "The document search broke. The case results stand, and the failed source is recorded as failed rather than empty.",
    path: ["q", "admit", "search", "cp", "rc", "write", "check", "save"],
    recedes: ["rc>rd", "rd>write", "dp>rd"], hidden: ["rd"], failedEdges: ["search>dp"],
    documentState: "failed", documentStatus: "not searched",
    answerProcessText: "Unchecked. The answer states that documents could not be searched. It does not say no rule exists.",
    notes: {},
  },
];

export const answerProcessTitle = "What the process says";
export const answerCasesTitle = "How similar cases went";
export const answerCasesText = "Staged rollout, all-at-once launch, and dark launch, each cited.";
export const answerPendingTitle = "The answer so far";
export const answerPendingText = "Nothing yet. Progress here comes from tool events, not a story written by the model.";

export function runById(id: OutcomeId): Run {
  const found = runs.find((run) => run.id === id);
  if (!found) throw new Error(`Unknown engine outcome ${id}`);
  return found;
}

export function noteFor(run: Run, id: NodeId): Note {
  if (id === "search") return { title: run.searchTitle, body: run.searchBody, code: `code: ${run.code}` };
  if (id === "cp") return { title: "The system chooses a path.", body: `${run.activity}.`, code: `search_knowledge · ${run.activity}` };
  return run.notes[id] ?? shared[id] ?? { title: nodeText[id][0], body: "" };
}

/** Geometry only. The wide map has five columns; the tall map is the phone recomposition. */
export type Layout = {
  viewBox: readonly [width: number, height: number];
  w: number;
  h: number;
  axis: "x" | "y";
  nodes: Record<NodeId, readonly [x: number, y: number]>;
};

export const layouts: { wide: Layout; tall: Layout } = {
  wide: {
    viewBox: [1120, 430], w: 176, h: 64, axis: "x",
    nodes: { q: [120, 110], admit: [120, 290], search: [345, 200], cp: [565, 80], dp: [565, 320], rc: [780, 80], rd: [780, 320], write: [1000, 80], check: [1000, 200], save: [1000, 320] },
  },
  tall: {
    viewBox: [358, 484], w: 140, h: 44, axis: "y",
    nodes: { q: [190, 24], admit: [190, 80], search: [190, 136], cp: [96, 206], dp: [270, 206], rc: [96, 276], rd: [270, 276], write: [190, 346], check: [190, 402], save: [190, 458] },
  },
};

export const timing = { hold: 1250, move: 1000, trace: 1700, rest: 450, pad: 12 } as const;
