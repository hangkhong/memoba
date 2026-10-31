import type { ReactNode } from "react";
import { cn } from "cn";
import { MetricHelp, type MetricKey } from "./metric-help";
import type { DashboardMetrics } from "./metrics";
import type { DashboardSnapshot } from "./snapshot";

const dash = "—";
const pct = (value: number | null) => value === null ? dash : `${value}%`;

function Cell({ question, children }: { question: string; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col p-4 not-first:border-l @max-[1000px]:nth-3:border-l-0 @max-[1000px]:nth-[n+3]:border-t @max-[640px]:not-first:border-t @max-[640px]:not-first:border-l-0"><h2 className="text-[13px] font-semibold">{question}</h2>{children}</div>;
}
function Figure({ lead, muted, children }: { lead?: boolean; muted?: boolean; children: ReactNode }) {
  return <p className={cn("mt-2.5 leading-[1.15] tracking-[-0.02em]", lead ? "text-[34px] font-semibold" : "text-2xl font-medium", muted && "text-muted-foreground")}>{children}</p>;
}
function Label({ metric, children }: { metric: MetricKey; children: ReactNode }) { return <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">{children}<MetricHelp metric={metric}/></p>; }
function SubRows({ children }: { children: ReactNode }) { return <dl className="mt-auto pt-3">{children}</dl>; }
function SubRow({ label, metric, value }: { label: string; metric: MetricKey; value: ReactNode }) {
  return <div className="flex items-center gap-1.5 border-t py-[5px] text-[13px] @max-[640px]:py-[7px]"><dt className="flex min-w-0 flex-1 items-center gap-1 text-muted-foreground">{label}<MetricHelp metric={metric}/></dt><dd className="font-medium whitespace-nowrap">{value}</dd></div>;
}

export function KpiStrip({ snapshot, metrics }: { snapshot: DashboardSnapshot; metrics: DashboardMetrics }) {
  const { answers, members } = snapshot;
  const empty = metrics.answersTotal === 0;
  return <section aria-label="Key measures" className="grid grid-cols-[1.2fr_1fr_1fr_1fr] rounded-lg border @max-[1000px]:grid-cols-2 @max-[640px]:grid-cols-1">
    <Cell question="Can answers be trusted?">
      <Figure lead muted={metrics.citedRate === null}>{pct(metrics.citedRate)}</Figure>
      <Label metric="evidence">Evidence-backed answers</Label>
      {metrics.citedRateDelta !== null && <p className={cn("mt-0.5 text-xs", metrics.citedRateDelta >= 0 ? "text-emerald-800" : "text-red-800")}>{metrics.citedRateDelta >= 0 ? "+" : "−"}{Math.abs(metrics.citedRateDelta)} pts vs prior 30 days</p>}
      {!empty && <div role="img" aria-label={`${answers.cited} of ${answers.total} answers cited evidence`} className="mt-2.5 flex h-1.5 gap-0.5"><i className="block rounded-l-[3px] bg-chart-1" style={{ width: `${answers.cited / answers.total * 100}%` }}/><i className="block flex-1 rounded-r-[3px] bg-accent"/></div>}
      {!empty && <SubRows><SubRow label="Source not searched" metric="unsearched" value={pct(metrics.unsearchedRate)}/><SubRow label="p90 time to answer" metric="p90" value={answers.p90Seconds === null ? dash : `${answers.p90Seconds} s`}/></SubRows>}
    </Cell>
    <Cell question="Is the team using it?">
      <Figure>{members.weeklyActive} <small className="text-sm font-normal tracking-normal text-muted-foreground">of {members.total}</small></Figure>
      <Label metric="weeklyActive">Weekly active members</Label>
      {!empty && <SubRows><SubRow label="Returned within 7 days" metric="returned" value={pct(metrics.returnedRate)}/></SubRows>}
    </Cell>
    <Cell question="Is the knowledge alive?">
      <Figure muted={metrics.unknownCitationRate === null}>{pct(metrics.unknownCitationRate)}</Figure>
      <Label metric="unknown">Cited, outcome unknown</Label>
      {!empty && <SubRows><SubRow label="Not cited in 30 days" metric="uncited" value={pct(metrics.uncitedRate)}/><SubRow label="Documents due for review" metric="dueForReview" value={snapshot.documentsDueForReview.length}/></SubRows>}
    </Cell>
    <Cell question="Is knowledge growing?">
      <Figure>{snapshot.knowledgeGaps.length}</Figure>
      <Label metric="gaps">Topics with no matching case</Label>
      {!empty && <SubRows><SubRow label="No outcome after 30 days" metric="overdue" value={metrics.overdueOutcomes.length}/></SubRows>}
    </Cell>
  </section>;
}
