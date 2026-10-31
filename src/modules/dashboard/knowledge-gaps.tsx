import Link from "next/link";
import { MetricHelp } from "./metric-help";
import { EmptyLine, Panel, rowClass } from "./panel";
import type { DashboardSnapshot } from "./snapshot";

export function KnowledgeGaps({ gaps }: { gaps: DashboardSnapshot["knowledgeGaps"] }) {
  return <Panel title="Knowledge gaps" help={<MetricHelp metric="gaps"/>}>
    {gaps.length === 0 ? <EmptyLine>No unmatched topics yet.</EmptyLine> : gaps.map((gap) =>
      <div key={gap.topic} className={`${rowClass} flex items-center justify-between gap-2`}>
        <div className="min-w-0"><b className="block font-medium">{gap.topic}</b><small className="text-xs text-muted-foreground">Asked {gap.asks} times</small></div>
        <Link href="/workspace/knowledge?record=1" aria-label={`Record a case for ${gap.topic}`} className="text-[13px] font-medium whitespace-nowrap text-chart-1 hover:underline">Record</Link>
      </div>)}
  </Panel>;
}
