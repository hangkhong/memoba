"use client";
import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ATTENTION_PREVIEW_COUNT } from "./snapshot";
import { EmptyLine, Panel } from "./panel";

// Labels and links are resolved on the server, so this component only lays rows out and toggles the list.
export type AttentionRow = { key: string; kind: string; title: string; evidence: string; owner: string; actionLabel: string; href: string | null };

export function AttentionQueue({ rows }: { rows: AttentionRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, ATTENTION_PREVIEW_COUNT);
  const toggle = rows.length > ATTENTION_PREVIEW_COUNT && <button type="button" aria-expanded={expanded} aria-controls="attention-list" onClick={() => setExpanded(!expanded)} className="cursor-pointer text-[13px] font-medium whitespace-nowrap text-chart-1 hover:underline">{expanded ? "Show fewer" : `View all ${rows.length}`}</button>;
  return <Panel id="attention" title="Needs attention" count={rows.length} action={toggle || undefined}>
    {rows.length === 0 ? <EmptyLine>Nothing needs attention. Ask a question to start measuring. <Link href="/workspace/chat" className="font-medium text-chart-1 hover:underline">New chat</Link></EmptyLine> : <ul id="attention-list">{shown.map((row) =>
      <li key={row.key} className="grid grid-cols-[128px_minmax(0,1fr)_148px_auto] items-center gap-3 border-t px-4 py-[9px] hover:bg-muted @max-[1000px]:grid-cols-[minmax(0,1fr)_auto] @max-[640px]:grid-cols-[minmax(0,1fr)]">
        <span className="text-xs text-muted-foreground @max-[1000px]:hidden">{row.kind}</span>
        <div><b className="block font-medium [overflow-wrap:anywhere]">{row.title}</b><span className="text-xs text-muted-foreground"><span className="hidden @max-[1000px]:inline">{row.kind} · </span>{row.evidence}</span></div>
        <span className="text-xs text-muted-foreground @max-[1000px]:hidden">{row.owner}</span>
        {row.href && <Link href={row.href} className={buttonVariants({ variant: "outline", className: "h-[30px] border-input min-w-[124px] px-2.5 text-[13px] font-medium whitespace-nowrap @max-[640px]:h-11 @max-[640px]:min-w-0 @max-[640px]:justify-self-start @max-[640px]:border-0 @max-[640px]:bg-transparent @max-[640px]:px-0 @max-[640px]:text-chart-1" })}>{row.actionLabel}</Link>}
      </li>)}</ul>}
  </Panel>;
}
