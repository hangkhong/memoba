import { MetricHelp } from "./metric-help";
import { EmptyLine, Panel, rowClass } from "./panel";
import type { DashboardMetrics } from "./metrics";

const tints = ["#e6f1f4", "#f4ecdd", "#e9e8f6", "#e6f3e6", "#f6e7ea"];
const initials = (name: string) => name.split(" ").map((word) => word[0]).join("");

// Citations are the large figure: a contributor with few, much-cited cases outranks one with many unused ones.
export function Contributors({ contributors }: { contributors: DashboardMetrics["contributors"] }) {
  const earned = contributors.some((person) => person.citations > 0);
  return <Panel title="Contributors" help={<MetricHelp metric="contributors"/>}>
    {!earned ? <EmptyLine>No citations earned yet.</EmptyLine> : contributors.map((person, index) =>
      <div key={person.name} className={`${rowClass} flex items-center gap-2`}>
        <span aria-hidden="true" className="grid size-[26px] flex-none place-items-center rounded-full text-[11px] font-semibold" style={{ background: tints[index % tints.length] }}>{initials(person.name)}</span>
        <div className="min-w-0 flex-1"><b className="block font-medium">{person.name}</b><small className="text-xs text-muted-foreground">{person.cases} {person.cases === 1 ? "case" : "cases"}</small></div>
        <strong className="font-medium">{person.citations}</strong>
      </div>)}
  </Panel>;
}
