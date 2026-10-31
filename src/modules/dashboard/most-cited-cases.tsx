import { Pill } from "@/components/badges";
import { outcomeLabels, outcomeTones } from "@/modules/cases/presentation";
import { cn } from "cn";
import { MetricHelp } from "./metric-help";
import { EmptyLine, Panel, rowClass } from "./panel";
import type { DashboardMetrics } from "./metrics";

// Bars share one scale, the top case. Unknown outcomes are grey so weak evidence stays visible.
export function MostCitedCases({ cases }: { cases: DashboardMetrics["topCases"] }) {
  const max = cases[0]?.citations ?? 0;
  return <Panel title="Most-cited cases" help={<MetricHelp metric="mostCited"/>} className="@max-[1000px]:col-span-full">
    {cases.length === 0 ? <EmptyLine>Cited cases appear here after the first answers.</EmptyLine> : cases.map((item) =>
      <div key={item.title} className={rowClass}>
        <div className="flex items-start justify-between gap-2"><span className="min-w-0 font-medium">{item.title}</span><Pill tone={outcomeTones[item.outcome]}>{outcomeLabels[item.outcome]}</Pill></div>
        <div className="mt-[5px] flex items-center gap-2 text-xs text-muted-foreground"><span className="min-w-0 flex-1"><i className={cn("block h-2 rounded-r-[4px]", item.outcome === "unknown" ? "bg-muted-foreground/50" : "bg-chart-1")} style={{ width: `${item.citations / max * 100}%` }}/></span><span>{item.citations}</span></div>
      </div>)}
  </Panel>;
}
