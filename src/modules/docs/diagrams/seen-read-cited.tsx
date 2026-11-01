"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DiagramFrame, Legend, Mark, eyebrow, type Kind } from "./parts";

type Stage = "seen" | "read" | "cited";
type Source = { id: string; kind: Kind; stage: Stage; title: string };
type Heading = Kind;

// These are the answer headings checked by citationPlacement in src/modules/briefs/validation.ts.
export const headings: Record<Heading, string> = { doc: "What the process says", case: "How similar cases went" };

export const sources: readonly Source[] = [
  { id: "s1", kind: "case", stage: "seen", title: "Pricing change rollout" },
  { id: "s2", kind: "case", stage: "seen", title: "Vendor switch" },
  { id: "s3", kind: "doc", stage: "seen", title: "Data retention policy" },
  { id: "s4", kind: "case", stage: "seen", title: "Holiday change freeze" },
  { id: "s5", kind: "doc", stage: "seen", title: "Support escalation guide" },
  { id: "r1", kind: "case", stage: "read", title: "All-at-once launch" },
  { id: "r2", kind: "doc", stage: "read", title: "Rollback checklist" },
  { id: "c1", kind: "case", stage: "cited", title: "Staged rollout" },
  { id: "c2", kind: "doc", stage: "cited", title: "Release approval policy" },
];

export type Verdict = { allowed: boolean; why: string };
// Mirrors the order of the real checks: a marker must exist (the section was read this run), then the heading must fit the kind.
export function verdict(source: Source, heading: Heading): Verdict {
  if (source.stage === "seen") return { allowed: false, why: "This was only seen in a search result. No citation marker exists for it, because one is issued only when a section is read." };
  if (source.kind !== heading) return { allowed: false, why: source.kind === "case" ? "A case says what happened, so it can't stand behind a requirement." : "A document says what is required, so it can't stand in for what happened." };
  return { allowed: true, why: "It was opened during this run, so the application issued it a marker. Your access to it is checked next." };
}

const stageName: Record<Stage, string> = { seen: "seen only", read: "read", cited: "read and cited" };

export function SeenReadCited() {
  const [selected, setSelected] = useState<Source | null>(null);
  const [heading, setHeading] = useState<Heading>("case");
  const pick = (source: Source) => { setSelected(source); setHeading(source.kind); };
  const result = selected ? verdict(selected, heading) : null;
  const button = (source: Source) => <button key={source.id} type="button" aria-pressed={selected?.id === source.id} aria-label={`${source.title}, ${source.kind === "case" ? "case" : "document"}, ${stageName[source.stage]}`} title={source.title} onClick={() => pick(source)}
    className="grid size-9 cursor-pointer place-items-center rounded-md border border-transparent hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-accent"><Mark kind={source.kind} className="size-5"/></button>;
  const of = (stage: Stage) => sources.filter((source) => source.stage === stage).map(button);
  return <DiagramFrame label="Three nested sets. Everything the agent saw in search results contains the smaller set it opened and read, which contains the smaller set the answer cites. Select a source and a heading to try citing it: only a source that was read, under the heading that fits its kind, is allowed." note="Illustrative: the sources and their numbers are made up.">
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-dashed bg-background p-2">
        <div className={eyebrow}>Seen · search previews and document cards, never citable</div>
        <div className="flex flex-wrap gap-1">{of("seen")}</div>
        <div className="flex flex-col gap-2 rounded-lg border border-primary/60 p-2">
          <div className={eyebrow}>Read · opened in this run, each section gets a marker</div>
          <div className="flex flex-wrap gap-1">{of("read")}</div>
          <div className="flex flex-col gap-2 rounded-md border-2 border-primary p-2">
            <div className={eyebrow}>Cited · in the answer</div>
            <div className="flex flex-wrap gap-1">{of("cited")}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Try citing it under</span>
        {(["doc", "case"] as const).map((kind) => <button key={kind} type="button" aria-pressed={selected !== null && heading === kind} disabled={selected === null} onClick={() => setHeading(kind)}
          className="min-h-9 cursor-pointer rounded-full border bg-background px-3 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">{headings[kind]}</button>)}
      </div>
      <div aria-live="polite" className={cn("min-h-16 rounded-md border bg-background p-3", result && (result.allowed ? "border-chart-1" : "border-dashed border-primary"))}>
        {selected && result ? <><div className="font-semibold">{result.allowed ? "Allowed" : "Blocked"}: {selected.title}</div><div className="text-muted-foreground">{result.why}</div></> : <div className="text-muted-foreground">Select a source above to try citing it.</div>}
      </div>
      <Legend/>
    </div>
  </DiagramFrame>;
}
