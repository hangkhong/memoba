"use client";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { sectionLabels, outcomeLabels } from "@/modules/cases/presentation";
import type { EvidenceItem } from "@/modules/knowledge/contracts";

const EvidenceContext = createContext<((item: EvidenceItem) => void) | null>(null);
function subscribe(callback: () => void) { const media = window.matchMedia("(min-width: 1280px)"); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); }
function desktopSnapshot() { return window.matchMedia("(min-width: 1280px)").matches; }
function serverSnapshot() { return false; }
export function EvidenceLayout({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<EvidenceItem | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  useEffect(() => { if (selected && desktop) closeButton.current?.focus(); }, [selected, desktop]);
  function close() { setSelected(null); requestAnimationFrame(() => trigger.current?.focus()); }
  return <EvidenceContext value={(item) => { trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setSelected(item); }}>
    <div className="flex min-w-0 items-start"><div className="min-w-0 flex-1">{children}</div>
      {selected && desktop && <aside aria-label="Source evidence" onKeyDown={(event) => { if (event.key === "Escape") close(); }} className="sticky top-0 h-svh w-[360px] shrink-0 overflow-y-auto border-l p-6"><div className="flex items-start justify-between gap-3"><h2 className="text-base font-semibold">Source evidence</h2><Button ref={closeButton} variant="ghost" size="icon-sm" onClick={close} aria-label="Close source"><X/></Button></div><EvidenceContent item={selected}/></aside>}
    </div>
    {!desktop && <Sheet open={!!selected} onOpenChange={(open) => { if (!open) close(); }}><SheetContent className="overflow-y-auto data-[side=right]:w-full sm:max-w-[360px]" finalFocus={trigger}><SheetHeader><SheetTitle>Source evidence</SheetTitle></SheetHeader>{selected && <div className="px-5 pb-6"><EvidenceContent item={selected}/></div>}</SheetContent></Sheet>}
  </EvidenceContext>;
}
function EvidenceContent({ item }: { item: EvidenceItem }) {
  return <div className="mt-5 space-y-5"><div><p className="text-xs text-[var(--evidence-accent)]">{sectionLabels[item.sectionKey]}</p><h3 className="mt-2 text-lg font-medium leading-6">{item.caseTitle}</h3><p className="mt-2 text-xs text-muted-foreground">Recorded outcome: {outcomeLabels[item.outcome]}</p></div><blockquote className="whitespace-pre-wrap border-l-2 border-ring pl-4 text-sm leading-7">{item.excerpt}</blockquote><p className="text-xs leading-5 text-muted-foreground">Source recorded {new Date(item.recordedAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}. This excerpt belongs to the cited revision.</p><details className="text-xs text-muted-foreground"><summary className="cursor-pointer hover:text-foreground">Details</summary><p className="mt-2 break-all leading-6">Revision {item.revisionId}<br/>Section {item.sectionId}<br/>Author {item.authorId}</p></details><Link href={`/workspace/knowledge/${item.caseId}`} className="inline-block text-sm text-[var(--evidence-accent)] underline underline-offset-4">Open current case</Link></div>;
}
export function InlineEvidence({ item, number }: { item: EvidenceItem; number: number }) {
  const open = useContext(EvidenceContext);
  return <HoverCard><HoverCardTrigger render={<Button variant="secondary" size="xs" className="mx-0.5 inline-flex h-5 align-baseline px-1.5 text-xs text-[var(--evidence-accent)]" aria-label={`Open source ${number}: ${item.caseTitle}`} onClick={() => open?.(item)}/>}>[{number}]</HoverCardTrigger><HoverCardContent className="w-80 space-y-2 p-4"><p className="font-medium">{item.caseTitle}</p><p className="text-xs text-muted-foreground">{sectionLabels[item.sectionKey]}</p><blockquote className="line-clamp-5 text-sm leading-6">{item.excerpt}</blockquote></HoverCardContent></HoverCard>;
}
export function EvidenceSources({ evidence }: { evidence: readonly EvidenceItem[] }) {
  const open = useContext(EvidenceContext);
  if (!evidence.length) return null;
  return <Trace className="mt-6"><TraceCollapsible><TraceCollapsibleTrigger><TraceLine><TraceIcon><BookOpen/></TraceIcon><TraceTitle>{evidence.length} {evidence.length === 1 ? "source" : "sources"} from your Knowledge Hub</TraceTitle></TraceLine></TraceCollapsibleTrigger><TraceCollapsibleContent keepMounted><Trace>{evidence.map((item) => <button key={item.evidenceId} onClick={() => open?.(item)} className="text-left"><TraceLine><TraceTitle className="whitespace-normal">{item.caseTitle} · {sectionLabels[item.sectionKey]}</TraceTitle></TraceLine></button>)}</Trace></TraceCollapsibleContent></TraceCollapsible></Trace>;
}
