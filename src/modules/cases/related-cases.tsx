"use client";
import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkDialog, RemoveLinkDialog, type RelatedLink } from "./link-dialog";
import { RailSection } from "./case-rail";
import { relationLabels } from "./presentation";

type Panel = { kind: "add" } | { kind: "edit" | "remove"; link: RelatedLink } | null;
const addClass = "text-sm font-medium text-[var(--evidence-accent)] underline-offset-4 hover:underline";

// Archived cases are read-only for links, so `editable` is false for them.
export function RelatedCases({ caseId, links, candidates, editable }: { caseId: string; links: RelatedLink[]; candidates: { id: string; title: string }[]; editable: boolean }) {
  const [panel, setPanel] = useState<Panel>(null); const close = () => setPanel(null);
  const canAdd = editable && candidates.length > 0;
  const add = <button type="button" className={addClass} onClick={() => setPanel({ kind: "add" })}>Add case</button>;
  return <RailSection title="Related cases" action={links.length > 0 && canAdd ? add : undefined}>
    {links.length === 0
      ? <p className="text-muted-foreground">No related cases yet.{canAdd && <> {add}</>}</p>
      : <ul className="-mx-2">{links.map((link) => <li key={link.key} className="group relative rounded-lg px-2 py-1.5 focus-within:bg-muted hover:bg-muted">
        <Link href={`/workspace/knowledge/${link.other}`} className={`block truncate font-medium ${editable ? "pr-14" : ""}`}>{link.title}</Link>
        <p className="truncate text-xs leading-4 text-muted-foreground">{relationLabels[link.relation][link.direction]} · {link.reason}</p>
        {editable && <div className="absolute top-1.5 right-1.5 hidden gap-0.5 group-focus-within:flex group-hover:flex [@media(hover:none)]:flex">
          <Button variant="ghost" size="icon-xs" aria-label={`Edit link to ${link.title}`} onClick={() => setPanel({ kind: "edit", link })}><Pencil aria-hidden="true"/></Button>
          <Button variant="ghost" size="icon-xs" aria-label={`Remove link to ${link.title}`} onClick={() => setPanel({ kind: "remove", link })}><Trash2 aria-hidden="true"/></Button>
        </div>}
      </li>)}</ul>}
    {panel?.kind === "add" && <LinkDialog caseId={caseId} cases={candidates} onClose={close}/>}
    {panel?.kind === "edit" && <LinkDialog caseId={caseId} cases={candidates} link={panel.link} onClose={close}/>}
    {panel?.kind === "remove" && <RemoveLinkDialog caseId={caseId} link={panel.link} onClose={close}/>}
  </RailSection>;
}
