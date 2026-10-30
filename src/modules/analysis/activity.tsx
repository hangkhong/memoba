"use client";
import { useState } from "react";
import { CircleCheck, CircleDashed, CircleX, LoaderCircle } from "lucide-react";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import type { AnalysisEvent, Terminal } from "./events";
import { activitySteps } from "./activity-presentation";

const summaries = { running: "Working with your knowledge", complete: "Analysis complete", gap_report: "Search finished without usable evidence", failed: "Analysis failed", cancelled: "Analysis stopped", timed_out: "Analysis reached its time limit" };
export function AnalysisActivity({ events, status }: { events: readonly AnalysisEvent[]; status?: "running" | Terminal }) {
  const [choice, setChoice] = useState<{ running: boolean; open: boolean } | null>(null);
  if (!events.length) return null;
  const running = status === "running";
  const open = choice?.running === running ? choice.open : running;
  const steps = activitySteps(events, status);
  const failed = steps.some((step) => step.state === "error");
  const title = status ? summaries[status] : "Recorded activity";
  return <Trace aria-label="Analysis activity"><TraceCollapsible open={open} onOpenChange={(next) => setChoice({ running, open: next })}>
    <TraceCollapsibleTrigger><TraceLine status={running ? "running" : status === "failed" ? "error" : undefined}><TraceIcon>{running ? <LoaderCircle className="animate-spin motion-reduce:animate-none"/> : status === "complete" || status === "gap_report" ? <CircleCheck/> : <CircleDashed/>}</TraceIcon><TraceTitle>{title}{failed && status === "complete" ? " · one step failed" : ""}</TraceTitle></TraceLine></TraceCollapsibleTrigger>
    <TraceCollapsibleContent keepMounted><Trace className="gap-1.5">{steps.map((step) => <TraceLine key={step.key} status={step.state === "complete" ? undefined : step.state}><TraceIcon>{step.state === "error" ? <CircleX/> : step.state === "running" ? <LoaderCircle className="animate-spin motion-reduce:animate-none"/> : step.state === "pending" ? <CircleDashed/> : <CircleCheck/>}</TraceIcon><TraceTitle className="whitespace-normal">{step.text}</TraceTitle></TraceLine>)}</Trace></TraceCollapsibleContent>
  </TraceCollapsible></Trace>;
}
