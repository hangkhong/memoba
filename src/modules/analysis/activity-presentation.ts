import type { AnalysisEvent, Terminal } from "./events";

export function activityGroups(events: readonly AnalysisEvent[], status?: "running" | Terminal) {
  const groups = new Map<string, { key: string; stage: AnalysisEvent["stage"]; tool: AnalysisEvent["tool"]; started: number; completed: number; failed: number; found?: number; events: AnalysisEvent[] }>();
  for (const event of events) {
    const key = event.tool ?? event.stage;
    const group = groups.get(key) ?? { key, stage: event.stage, tool: event.tool, started: 0, completed: 0, failed: 0, events: [] };
    group.events.push(event);
    if (event.state === "started") group.started++;
    if (event.state === "completed") { group.completed++; if (event.count !== undefined) group.found = event.count; }
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
// Plain-language wording per group. Every phrase is built from what the events record.
const phrases: Record<string, { done: (group: Group) => string; doing: string; failed: string }> = {
  intake: { done: () => "Understood your question", doing: "Reading your question", failed: "Couldn't read your question" },
  planning: { done: () => "Planned the search", doing: "Planning the search", failed: "Couldn't plan the search" },
  retrieval: { done: () => "Looked through your knowledge", doing: "Looking through your knowledge", failed: "Couldn't look through your knowledge" },
  context: { done: () => "Gathered the evidence", doing: "Gathering the evidence", failed: "Couldn't gather the evidence" },
  reasoning: { done: () => "Worked out the answer", doing: "Working out the answer", failed: "Couldn't work out the answer" },
  validation: { done: () => "Checked sources", doing: "Checking sources", failed: "Couldn't check the sources" },
  completion: { done: () => "Wrote the answer", doing: "Writing the answer", failed: "Couldn't write the answer" },
  search_knowledge: { done: (group) => `Searched your knowledge${group.found === undefined ? "" : ` · ${plural(group.found, "case")} found`}`, doing: "Searching your knowledge", failed: "Couldn't search your knowledge" },
  search_cases: { done: (group) => `Searched your knowledge${group.found === undefined ? "" : ` · ${plural(group.found, "case")} found`}`, doing: "Searching your knowledge", failed: "Couldn't search your knowledge" },
  // A call can read several cases, so the number comes from the recorded count, never from the number of calls.
  read_case: { done: (group) => group.found === undefined ? "Read case details" : `Read ${plural(group.found, "case")}`, doing: "Reading cases", failed: "Couldn't read a case" },
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
