"use client";
import { useState } from "react";
import { CircleCheck, CircleDashed, CircleX, LoaderCircle } from "lucide-react";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import type { AnalysisEvent, Terminal } from "./events";
import { activityGroups } from "./activity-presentation";

const stages = { intake: "Request", planning: "Retrieval planning", retrieval: "Knowledge search", context: "Evidence preparation", reasoning: "Answer preparation", validation: "Source reference checks", completion: "Analysis", tool: "Knowledge tool" } satisfies Record<AnalysisEvent["stage"], string>;
const tools = { search_knowledge: "Knowledge search", search_cases: "Case search", read_case: "Case reading", expand_relations: "Related case search" };
const summaries = { running: "Working with your knowledge", complete: "Analysis complete", gap_report: "Search finished without usable evidence", failed: "Analysis failed", cancelled: "Analysis stopped", timed_out: "Analysis reached its time limit" };
export function AnalysisActivity({ events, status }: { events: readonly AnalysisEvent[]; status?: "running" | Terminal }) {
  const [choice, setChoice] = useState<{ running: boolean; open: boolean } | null>(null);
  if (!events.length) return null;
  const running = status === "running";
  const open = choice?.running === running ? choice.open : running;
  const groups = activityGroups(events, status);
  const failed = groups.some((group) => group.failed > 0);
  const title = status ? summaries[status] : "Recorded activity";
  return <Trace aria-label="Analysis activity"><TraceCollapsible open={open} onOpenChange={(next) => setChoice({ running, open: next })}>
    <TraceCollapsibleTrigger><TraceLine status={running ? "running" : status === "failed" ? "error" : undefined}><TraceIcon>{running ? <LoaderCircle className="animate-spin motion-reduce:animate-none"/> : status === "complete" || status === "gap_report" ? <CircleCheck/> : <CircleDashed/>}</TraceIcon><TraceTitle>{title}{failed && status === "complete" ? " · includes a failed operation" : ""}</TraceTitle></TraceLine></TraceCollapsibleTrigger>
    <TraceCollapsibleContent keepMounted><Trace>{groups.map((group) => <TraceCollapsible key={group.key}><TraceCollapsibleTrigger>
      <TraceLine status={group.state === "complete" ? undefined : group.state}><TraceIcon>{group.state === "error" ? <CircleX/> : group.state === "running" ? <LoaderCircle className="animate-spin motion-reduce:animate-none"/> : group.state === "pending" ? <CircleDashed/> : <CircleCheck/>}</TraceIcon><TraceTitle className="whitespace-normal">{group.tool ? tools[group.tool] : stages[group.stage]}{group.tool ? ` · ${group.completed} operations completed` : ""}{group.failed > 0 ? ` · ${group.failed} failed` : ""}{group.unfinished > 0 ? running ? " · in progress" : " · unfinished" : ""}</TraceTitle></TraceLine></TraceCollapsibleTrigger>
      <TraceCollapsibleContent>{group.events.map((event, index) => <p key={index} className="text-xs leading-6"><time dateTime={event.at}>{new Date(event.at).toLocaleString("en-GB", { timeZone: "UTC", timeZoneName: "short" })}</time> · {event.state}{event.code ? ` · ${event.code}` : ""}{event.count !== undefined ? ` · ${event.count} items` : ""}</p>)}</TraceCollapsibleContent>
    </TraceCollapsible>)}</Trace></TraceCollapsibleContent>
  </TraceCollapsible></Trace>;
}
