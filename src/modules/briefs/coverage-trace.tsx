"use client";
import Link from "next/link";
import { CircleDashed, Search } from "lucide-react";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { moreUnreadLabel, type CoverageLine } from "./coverage-presentation";

export function UnreadCaseLines({ line }: { line: CoverageLine }) {
  return <>{line.unread.map((item) => {
    const row = <TraceLine><TraceIcon><CircleDashed/></TraceIcon><TraceTitle className="whitespace-normal">{item.title}</TraceTitle></TraceLine>;
    return item.caseId ? <Link key={item.caseId} prefetch={false} href={`/workspace/knowledge/${item.caseId}`} className="w-fit rounded-sm">{row}</Link> : <span key={item.title}>{row}</span>;
  })}{line.more > 0 && <TraceLine><TraceTitle>{moreUnreadLabel(line.more)}</TraceTitle></TraceLine>}</>;
}

// Coverage on its own, for answers shown without the analysis activity block.
export function CoverageTrace({ line }: { line: CoverageLine }) {
  const head = <TraceLine><TraceIcon><Search/></TraceIcon><TraceTitle className="whitespace-normal">{line.text}</TraceTitle></TraceLine>;
  if (!line.unread.length) return <Trace className="mb-3">{head}</Trace>;
  return <Trace className="mb-3"><TraceCollapsible><TraceCollapsibleTrigger>{head}</TraceCollapsibleTrigger><TraceCollapsibleContent><Trace className="gap-1.5"><UnreadCaseLines line={line}/></Trace></TraceCollapsibleContent></TraceCollapsible></Trace>;
}
