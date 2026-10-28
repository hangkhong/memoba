import type { AnalysisEvent } from "./events";

const stages = {
  intake: "Request intake",
  planning: "Retrieval planning",
  retrieval: "Knowledge retrieval",
  context: "Evidence preparation",
  reasoning: "Brief generation",
  validation: "Source validation",
  completion: "Analysis",
  tool: "Knowledge tool",
} satisfies Record<AnalysisEvent["stage"], string>;

function eventLabel(event: AnalysisEvent) {
  const name = event.tool ? event.tool.replaceAll("_", " ") : stages[event.stage];
  return `${name} · ${event.state}${event.count === undefined ? "" : ` · ${event.count} items`}`;
}

export function AnalysisActivity({ events }: { events: readonly AnalysisEvent[] }) {
  const latest = events.at(-1);
  if (!latest) return null;
  return <details className="rounded-xl border bg-muted/20 p-3 text-sm" aria-label="Analysis activity">
    <summary className="cursor-pointer text-muted-foreground"><span className="font-medium text-foreground">Activity</span> · {eventLabel(latest)}</summary>
    <ol className="mt-4 space-y-3 border-t pt-3">{events.map((event, index) => <li key={index} className="flex flex-wrap items-baseline justify-between gap-2"><span>{eventLabel(event)}{event.code && ` · ${event.code}`}</span><time className="text-xs text-muted-foreground" dateTime={event.at}>{event.at}</time></li>)}</ol>
  </details>;
}
