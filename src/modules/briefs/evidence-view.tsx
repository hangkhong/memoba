"use client";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { TagButton } from "@/components/badges";
import { DetailRows } from "@/components/rail";
import { SafeMarkdown } from "@/components/safe-markdown";
import { toneStyles } from "@/components/tone";
import { OutcomePill } from "@/modules/cases/case-badges";
import { formatDate } from "@/lib/format-date";
import { groupEvidenceSources } from "./evidence-sources";
import { dropMatchingHeading, plainPreview } from "./evidence-text";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { cn } from "cn";
import { sectionLabels } from "@/modules/cases/presentation";
import { z } from "zod";
import { isDocumentEvidence, type DocumentEvidence, type EvidenceItem } from "@/modules/knowledge/contracts";
import { documentTypeLabels } from "@/modules/documents/presentation";

export const evidenceTitle = (item: EvidenceItem) => isDocumentEvidence(item) ? item.documentTitle : item.caseTitle;
// A document section reads as part of the process, a case section as a part of the case.
export const evidenceLabel = (item: EvidenceItem) => isDocumentEvidence(item) ? `Process · ${item.heading}` : sectionLabels[item.sectionKey];

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
const linkClass = buttonVariants({ variant: "outline", size: "sm" });
// One layout for both kinds: where it comes from, the cited text, what it is, and a way to the source.
function EvidenceContent({ item }: { item: EvidenceItem }) {
  const document = isDocumentEvidence(item);
  const rows = document
    ? [{ label: "Version", value: item.version }, { label: "Effective", value: formatDate(item.effectiveFrom) }, { label: "Type", value: documentTypeLabels[item.type] }, { label: "Area", value: item.area }, { label: "Owner", value: item.owner }]
    : [{ label: "Outcome", value: <OutcomePill outcome={item.outcome}/> }, { label: "Recorded", value: formatDate(item.recordedAt) }];
  return <div className="mt-5 space-y-5">
    <div><p className="text-xs text-[var(--evidence-accent)]">{evidenceLabel(item)}</p><h3 className="mt-2 text-lg font-medium leading-6">{evidenceTitle(item)}</h3></div>
    {document && <NewerVersion item={item}/>}
    <blockquote className={document ? "text-sm" : "text-sm leading-7 whitespace-pre-wrap"}>{document ? <SafeMarkdown mode="static" className="evidence-markdown">{dropMatchingHeading(item.excerpt, item.heading)}</SafeMarkdown> : item.excerpt}</blockquote>
    <DetailRows rows={rows}/>
    {document
      ? <Link href={`/workspace/knowledge/documents/${item.documentId}?version=${item.version}#block-${item.block}`} className={linkClass}>Open cited section</Link>
      : <Link href={`/workspace/knowledge/${item.caseId}`} className={linkClass}>Open current case</Link>}
  </div>;
}
const currentSchema = z.object({ lifecycle: z.enum(["active", "archived"]), published_revision_id: z.uuid().nullable(), revisions: z.array(z.object({ id: z.uuid(), version: z.number() })) });
// The saved citation keeps its own version's text. This only says whether that version is still the current one.
function NewerVersion({ item }: { item: DocumentEvidence }) {
  const [state, setState] = useState<{ id: string; text: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/documents/${item.documentId}`, { cache: "no-store", signal: controller.signal }).then((response) => response.ok ? response.json() : null).then((raw: unknown) => {
      const detail = currentSchema.safeParse(raw);
      if (!detail.success) return;
      const current = detail.data.revisions.find((revision) => revision.id === detail.data.published_revision_id);
      if (detail.data.lifecycle === "archived") setState({ id: item.evidenceId, text: "This document has been archived. The cited text below is unchanged." });
      else if (current && current.version > item.version) setState({ id: item.evidenceId, text: `A newer version exists (version ${current.version}). The cited text below is from version ${item.version}.` });
      else setState(null);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [item.documentId, item.evidenceId, item.version]);
  return state?.id === item.evidenceId ? <p role="note" className={cn("rounded-md px-3 py-2 text-xs leading-5", toneStyles.warning.pill)}>{state.text}</p> : null;
}
export function InlineEvidence({ item, number }: { item: EvidenceItem; number: number }) {
  const open = useContext(EvidenceContext);
  return <HoverCard><HoverCardTrigger render={<Button variant="secondary" size="xs" className="mx-0.5 inline-flex h-5 align-baseline px-1.5 text-xs text-[var(--evidence-accent)]" aria-label={`Open source ${number}: ${evidenceTitle(item)}`} onClick={() => open?.(item)}/>}>[{number}]</HoverCardTrigger><HoverCardContent className="w-80 space-y-2 p-4"><p className="font-medium">{evidenceTitle(item)}</p><p className="text-xs text-muted-foreground">{evidenceLabel(item)}</p><blockquote className="line-clamp-5 text-sm leading-6">{isDocumentEvidence(item) ? plainPreview(item.excerpt) : item.excerpt}</blockquote></HoverCardContent></HoverCard>;
}
export function EvidenceSources({ evidence }: { evidence: readonly EvidenceItem[] }) {
  const open = useContext(EvidenceContext);
  const groups = groupEvidenceSources(evidence);
  if (!groups.length) return null;
  return <Trace className="mt-6"><TraceCollapsible><TraceCollapsibleTrigger><TraceLine><TraceIcon><BookOpen/></TraceIcon><TraceTitle>{groups.length} {groups.length === 1 ? "source" : "sources"} from your Knowledge Hub</TraceTitle></TraceLine></TraceCollapsibleTrigger><TraceCollapsibleContent keepMounted><ul className="mt-2 space-y-3 pl-6">{groups.map((group) => <li key={group.key}>
    <p className="text-sm leading-5"><span className="mr-2 text-xs text-muted-foreground">{group.kind === "case" ? "Case" : "Process"}</span>{group.title}</p>
    <div className="mt-1.5 flex flex-wrap gap-1.5">{group.tags.map((tag) => <TagButton key={tag.evidence.evidenceId} aria-label={`Open ${tag.label} from ${group.title}`} onClick={() => open?.(tag.evidence)}>{tag.label}</TagButton>)}</div>
  </li>)}</ul></TraceCollapsibleContent></TraceCollapsible></Trace>;
}
