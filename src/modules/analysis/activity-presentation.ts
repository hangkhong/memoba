import type { AnalysisEvent, Terminal } from "./events";

export function activityGroups(events: readonly AnalysisEvent[], status?: "running" | Terminal) {
  const groups = new Map<string, { key: string; stage: AnalysisEvent["stage"]; tool: AnalysisEvent["tool"]; started: number; completed: number; failed: number; events: AnalysisEvent[] }>();
  for (const event of events) {
    const key = event.tool ?? event.stage;
    const group = groups.get(key) ?? { key, stage: event.stage, tool: event.tool, started: 0, completed: 0, failed: 0, events: [] };
    group.events.push(event);
    if (event.state === "started") group.started++;
    if (event.state === "completed") group.completed++;
    if (event.state === "failed") group.failed++;
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const unfinished = Math.max(0, group.started - group.completed - group.failed);
    const state: "error" | "running" | "pending" | "complete" = group.failed > 0 ? "error" : unfinished > 0 ? status === "running" ? "running" : "pending" : "complete";
    return { ...group, unfinished, state };
  });
}
