"use client";
import { useState } from "react";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Choice, DiagramFrame, Legend, eyebrow, type Kind } from "./parts";

type Outcome = "ready" | "failed";
type Version = { label: string; note: string; live: boolean };
export type Moment = { title: string; stored: readonly Version[]; storedNote?: string; using: string };

const old: Version = { label: "v1", note: "published", live: true };
const older: Version = { label: "v1", note: "earlier version, still readable", live: false };

// What is stored and what answers use before an edit, while it is being saved, and afterwards.
export function moments(kind: Kind, outcome: Outcome): readonly [Moment, Moment, Moment] {
  const before: Moment = { title: "Before the edit", stored: [old], using: "v1" };
  if (kind === "case") return [before,
    { title: "Edit saved", stored: [old, { label: "v2", note: "being indexed", live: false }], using: "v1" },
    outcome === "ready" ? { title: "Afterwards", stored: [older, { label: "v2", note: "published", live: true }], using: "v2" }
      : { title: "Afterwards", stored: [old, { label: "v2", note: "indexing failed, kept so you can retry", live: false }], using: "v1" }];
  return [before,
    { title: "Publishing", stored: [old], storedNote: "The new version is embedded first. Nothing is stored yet.", using: "v1" },
    outcome === "ready" ? { title: "Afterwards", stored: [older, { label: "v2", note: "published", live: true }], using: "v2" }
      : { title: "Afterwards", stored: [old], storedNote: "The save failed, so nothing was stored.", using: "v1" }];
}

export function summary(kind: Kind, outcome: Outcome) {
  if (outcome === "ready") return "Once every section is indexed, the new version becomes the one answers use.";
  return kind === "case" ? "The edit is kept and flagged, so you can retry. Answers keep using the version they had." : "Nothing is stored, so no half-published rule exists. Answers keep using the version they had.";
}

function Chip({ version, kind }: { version: Version; kind: Kind }) {
  const ink = kind === "case" ? "bg-chart-1 text-white" : "bg-primary text-primary-foreground";
  return <div className={cn("rounded-md px-2 py-1", version.live ? ink : "border border-dashed bg-background")}><span className="font-semibold">{version.label}</span> <span className={version.live ? "" : "text-muted-foreground"}>{version.note}</span></div>;
}

// Takeaway: an edit stays out of answers until it is fully indexed; until then the last published version keeps answering.
export function EditGoesLive() {
  const [kind, setKind] = useState<Kind>("case");
  const [outcome, setOutcome] = useState<Outcome>("ready");
  const steps = moments(kind, outcome);
  return <DiagramFrame label="What is stored and what answers use, before an edit, while it is saved, and afterwards. Choose a case or a document, and whether indexing succeeds or fails. The version answers use only changes when indexing is complete." note="Shown for one edit to a case or a document that already has a published version.">
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Choice label="Editing a" options={[{ id: "case" as const, text: "Case" }, { id: "doc" as const, text: "Document" }]} value={kind} onChange={setKind}/>
        <Choice label="Indexing" options={[{ id: "ready" as const, text: "Succeeds" }, { id: "failed" as const, text: "Fails" }]} value={outcome} onChange={setOutcome}/>
      </div>
      <div className="grid items-stretch gap-2 @xl:grid-cols-[1fr_auto_1fr_auto_1fr]" aria-live="polite">
        {steps.map((step, i) => <div key={step.title} className="contents">
          {i > 0 && <div className="grid place-items-center text-muted-foreground"><ArrowRight aria-hidden className="hidden size-4 @xl:block"/><ArrowDown aria-hidden className="size-4 @xl:hidden"/></div>}
          <div className="flex min-w-0 flex-col gap-2 rounded-lg border bg-background p-3">
            <div className="font-semibold">{step.title}</div>
            <div><div className={eyebrow + " mb-1"}>Stored</div><div className="flex flex-col gap-1">{step.stored.map((version) => <Chip key={version.label + version.note} version={version} kind={kind}/>)}</div>{step.storedNote ? <div className="mt-1 text-muted-foreground">{step.storedNote}</div> : null}</div>
            <div className="mt-auto border-t pt-2"><div className={eyebrow + " mb-1"}>Answers use</div><div className="inline-flex items-center gap-1.5 font-semibold"><Check aria-hidden className="size-4"/>{step.using}</div></div>
          </div>
        </div>)}
      </div>
      <div className="font-medium">{summary(kind, outcome)}</div>
      <Legend/>
    </div>
  </DiagramFrame>;
}
