"use client";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { z } from "zod";
import { inputLimits } from "@/lib/contracts/limits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Trace, TraceDescription, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { FormDialog, FormDialogBody, FormDialogFooter } from "@/components/dialog-frame";
import { CaseForm } from "./case-form";
import { draftResponseSchema, type DraftResult } from "./draft-contract";
import { draftSummary } from "./draft-summary";

type Drafted = Extract<DraftResult, { kind: "draft" }>;
type Flow = { kind: "notes" } | { kind: "drafting"; startedAt: number } | { kind: "review"; result: Drafted; seconds: number } | { kind: "error"; message: string };
const errorSchema = z.object({ error: z.string() });

async function requestDraft(description: string, fileNames: string[], signal: AbortSignal): Promise<{ kind: "draft"; result: Drafted } | { kind: "error"; message: string }> {
  try {
    const response = await fetch("/api/cases/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description, fileNames }), signal });
    const raw: unknown = await response.json();
    if (!response.ok) { const parsed = errorSchema.safeParse(raw); return { kind: "error", message: parsed.success ? parsed.data.error : "Could not draft the case." }; }
    const drafted = draftResponseSchema.safeParse(raw);
    return drafted.success ? { kind: "draft", result: drafted.data } : { kind: "error", message: "The draft could not be read. Try again or record the case by hand." };
  } catch { return { kind: "error", message: "Could not reach the drafting service. Your notes are still here." }; }
}

function DraftingTrace({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  return <Trace role="status" aria-label="Drafting progress"><TraceLine status="running"><TraceIcon><LoaderCircle className="animate-spin motion-reduce:animate-none"/></TraceIcon><TraceTitle>Drafting a case from your notes</TraceTitle><TraceDescription>{Math.max(0, Math.floor((now - startedAt) / 1000))}s</TraceDescription></TraceLine></Trace>;
}

function DraftTrace({ result, seconds }: { result: Drafted; seconds: number }) {
  const summary = draftSummary(result.draft, result.missing);
  return <Trace aria-label="Drafting result" className="gap-1.5">
    <TraceLine><TraceIcon><CircleCheck/></TraceIcon><TraceTitle>Drafted from your notes</TraceTitle><TraceDescription>{seconds}s</TraceDescription></TraceLine>
    <TraceLine><TraceIcon><CircleCheck/></TraceIcon><TraceTitle className="whitespace-normal">Chose the {summary.template} template</TraceTitle></TraceLine>
    <TraceLine><TraceIcon><CircleCheck/></TraceIcon><TraceTitle className="whitespace-normal">Filled {summary.filled} of {summary.total} sections</TraceTitle></TraceLine>
    {summary.missing.length > 0 ? <TraceLine><TraceIcon><TriangleAlert/></TraceIcon><TraceTitle className="whitespace-normal">Not found in your notes: {summary.missing.join(", ")}</TraceTitle></TraceLine> : <TraceLine><TraceIcon><CircleCheck/></TraceIcon><TraceTitle className="whitespace-normal">Found every required section</TraceTitle></TraceLine>}
  </Trace>;
}

export function ImportCaseDialog({ open, onClose, concepts, onSaved }: { open: boolean; onClose: () => void; concepts: { id: string; label: string }[]; onSaved: (caseId: string) => void }) {
  const [flow, setFlow] = useState<Flow>({ kind: "notes" });
  const [notes, setNotes] = useState(""); const [fileNames, setFileNames] = useState<string[]>([]);
  const request = useRef<AbortController | null>(null);
  function addFiles(files: FileList | null) { if (files) setFileNames((current) => [...new Set([...current, ...Array.from(files, (file) => file.name.slice(0, 200))])].slice(0, 10)); }
  function close() { request.current?.abort(); request.current = null; setFlow({ kind: "notes" }); setNotes(""); setFileNames([]); onClose(); }
  async function draft() {
    const controller = new AbortController(); request.current = controller;
    const startedAt = Date.now(); setFlow({ kind: "drafting", startedAt });
    const outcome = await requestDraft(notes, fileNames, controller.signal);
    if (controller.signal.aborted) return;
    setFlow(outcome.kind === "draft" ? { kind: "review", result: outcome.result, seconds: Math.round((Date.now() - startedAt) / 1000) } : { kind: "error", message: outcome.message });
  }
  function stop() { request.current?.abort(); request.current = null; setFlow({ kind: "notes" }); }
  const title = flow.kind === "review" ? "Review the draft" : "Import from notes";
  const description = flow.kind === "review" ? "Check every field before saving. Nothing is saved until you do." : "Paste a postmortem, a thread, or meeting notes. You review the draft before it is saved.";
  return <FormDialog open={open} onOpenChange={(next) => { if (!next) close(); }} title={title} description={description}>
    {flow.kind === "review" ? <><div className="shrink-0 border-b px-6 py-4"><DraftTrace result={flow.result} seconds={flow.seconds}/></div><CaseForm key="review" initial={flow.result.draft} missing={flow.result.missing} concepts={concepts} onCancel={close} onSaved={(id) => { close(); onSaved(id); }}/></> : <>
      <FormDialogBody>
        {flow.kind === "drafting" ? <DraftingTrace startedAt={flow.startedAt}/> : <>
          <Field><FieldLabel htmlFor="import-notes">Paste your notes</FieldLabel>
            <Textarea id="import-notes" rows={8} maxLength={inputLimits.importText} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What was the problem, what did you try, and what happened?"/>
            <FieldDescription>{notes.length.toLocaleString("en-US")} / {inputLimits.importText.toLocaleString("en-US")} characters. Notes go to the AI model once and are not stored until you save the case.</FieldDescription>
          </Field>
          <div className="space-y-2" onDragOver={(event: DragEvent) => event.preventDefault()} onDrop={(event: DragEvent) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}>
            <label className="flex cursor-pointer flex-col gap-0.5 rounded-lg border border-dashed p-4 text-sm"><span className="font-medium">Add documents (preview)</span><span className="text-muted-foreground">Coming soon. Files are not read or uploaded.</span>
              <input type="file" multiple aria-label="Choose documents" className="sr-only" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }}/></label>
            {fileNames.length > 0 && <ul className="text-sm text-muted-foreground">{fileNames.map((name) => <li key={name}>{name}</li>)}</ul>}
          </div>
          {flow.kind === "error" && <p role="alert" className="text-sm text-destructive">{flow.message}</p>}
        </>}
      </FormDialogBody>
      <FormDialogFooter><Button type="button" variant="outline" onClick={flow.kind === "drafting" ? stop : close}>{flow.kind === "drafting" ? "Stop drafting" : "Cancel"}</Button>{flow.kind !== "drafting" && <Button type="button" disabled={notes.trim() === ""} onClick={() => { void draft(); }}>Draft case</Button>}</FormDialogFooter>
    </>}
  </FormDialog>;
}
