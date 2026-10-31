import type { AnalysisEvent, Terminal } from "./events";

export function activityGroups(events: readonly AnalysisEvent[], status?: "running" | Terminal) {
  const groups = new Map<string, { key: string; stage: AnalysisEvent["stage"]; tool: AnalysisEvent["tool"]; started: number; completed: number; failed: number; found?: number; code?: string; events: AnalysisEvent[] }>();
  for (const event of events) {
    const key = event.tool ?? event.stage;
    const group = groups.get(key) ?? { key, stage: event.stage, tool: event.tool, started: 0, completed: 0, failed: 0, events: [] };
    group.events.push(event);
    if (event.state === "started") group.started++;
    if (event.state === "completed") { group.completed++; if (event.count !== undefined) group.found = event.count; if (event.code) group.code = event.code; }
    if (event.state === "failed") group.failed++;
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const unfinished = Math.max(0, group.started - group.completed - group.failed);
    const state: "error" | "running" | "pending" | "complete" = group.failed > 0 ? "error" : unfinished > 0 ? status === "running" ? "running" : "pending" : "complete";
    return { ...group, unfinished, state };
  });
}

type Group = ReturnType<typeof activityGroups>[number];
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
// The search tool records one state per source in the event code, e.g. `cases:found:3;documents:none:0`. Runs saved earlier have no code.
const sourceWords = { cases: { one: "case", many: "cases" }, documents: { one: "document", many: "documents" } } as const;
type SourceState = { source: "cases" | "documents"; state: "found" | "none" | "partial" | "failed" | "repeat"; count: number };
export function sourceStates(code: string | undefined): SourceState[] {
  return (code?.split(";") ?? []).flatMap((part): SourceState[] => {
    const [source, state, count] = part.split(":");
    return (source === "cases" || source === "documents") && (state === "found" || state === "none" || state === "partial" || state === "failed" || state === "repeat") ? [{ source, state, count: Number(count) || 0 }] : [];
  });
}
function sourceText({ source, state, count }: SourceState) {
  const word = sourceWords[source];
  if (state === "found") return `${count} ${count === 1 ? word.one : word.many} found`;
  if (state === "partial") return `${count} ${count === 1 ? word.one : word.many} found, search incomplete`;
  if (state === "failed") return `${word.many} could not be searched`;
  if (state === "repeat") return `no new ${word.many}`;
  return `no ${word.many} matched`;
}
const searchDone = (group: Group) => { const states = sourceStates(group.code); return states.length ? `Searched cases and documents · ${states.map(sourceText).join(" · ")}` : `Searched your knowledge${group.found === undefined ? "" : ` · ${plural(group.found, "case")} found`}`; };
// Plain-language wording per group. Every phrase is built from what the events record.
const phrases: Record<string, { done: (group: Group) => string; doing: string; failed: string }> = {
  intake: { done: () => "Understood your question", doing: "Reading your question", failed: "Couldn't read your question" },
  planning: { done: () => "Planned the search", doing: "Planning the search", failed: "Couldn't plan the search" },
  retrieval: { done: () => "Looked through your knowledge", doing: "Looking through your knowledge", failed: "Couldn't look through your knowledge" },
  context: { done: () => "Gathered the evidence", doing: "Gathering the evidence", failed: "Couldn't gather the evidence" },
  reasoning: { done: () => "Worked out the answer", doing: "Working out the answer", failed: "Couldn't work out the answer" },
  validation: { done: () => "Checked sources", doing: "Checking sources", failed: "Couldn't check the sources" },
  completion: { done: () => "Wrote the answer", doing: "Writing the answer", failed: "Couldn't write the answer" },
  search_knowledge: { done: searchDone, doing: "Searching your knowledge", failed: "Couldn't search your knowledge" },
  search_cases: { done: (group) => `Searched your knowledge${group.found === undefined ? "" : ` · ${plural(group.found, "case")} found`}`, doing: "Searching your knowledge", failed: "Couldn't search your knowledge" },
  // A call can read several cases, so the number comes from the recorded count, never from the number of calls.
  read_case: { done: (group) => group.found === undefined ? "Read case details" : `Read ${plural(group.found, "case")}`, doing: "Reading cases", failed: "Couldn't read a case" },
  read_document: { done: () => "Read process document details", doing: "Reading process documents", failed: "Couldn't read a process document" },
  expand_relations: { done: () => "Followed related cases", doing: "Following related cases", failed: "Couldn't follow related cases" },
};

export type ActivityStep = { key: string; text: string; state: Group["state"] };
export function activitySteps(events: readonly AnalysisEvent[], status?: "running" | Terminal): ActivityStep[] {
  return activityGroups(events, status).map((group) => {
    const phrase = phrases[group.key];
    if (!phrase) return { key: group.key, text: group.state === "error" ? "A step failed" : "Worked on your request", state: group.state };
    const text = group.state === "error" ? phrase.failed : group.state === "running" ? phrase.doing : group.state === "pending" ? `Stopped while ${phrase.doing.charAt(0).toLowerCase()}${phrase.doing.slice(1)}` : phrase.done(group);
    return { key: group.key, text, state: group.state };
  });
}
