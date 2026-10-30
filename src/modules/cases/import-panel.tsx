"use client";
import { useState, type DragEvent } from "react";
import { z } from "zod";
import { inputLimits } from "@/lib/contracts/limits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { draftResponseSchema, type DraftResult } from "./draft-contract";

type Drafted = Extract<DraftResult, { kind: "draft" }>;
const errorSchema = z.object({ error: z.string() });

export function ImportPanel({ onDraft }: { onDraft: (draft: Drafted) => void }) {
  const [description, setDescription] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  function addFiles(files: FileList | null) {
    if (!files) return;
    setFileNames((current) => [...new Set([...current, ...Array.from(files, (file) => file.name.slice(0, 200))])].slice(0, 10));
  }
  async function draft() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/cases/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description, fileNames }) });
      const raw: unknown = await response.json();
      if (!response.ok) { const parsed = errorSchema.safeParse(raw); setError(parsed.success ? parsed.data.error : "Could not draft the case."); return; }
      const drafted = draftResponseSchema.safeParse(raw);
      if (!drafted.success) { setError("The draft could not be read. Try again or fill the form by hand."); return; }
      onDraft(drafted.data);
    } catch { setError("Could not reach the drafting service. Your notes are still here."); }
    finally { setPending(false); }
  }
  return <section aria-label="Import from notes" className="space-y-4 rounded-xl border p-5">
    <Field><FieldLabel htmlFor="import-notes">Paste your notes</FieldLabel>
      <Textarea id="import-notes" rows={6} maxLength={inputLimits.importText} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Paste a postmortem, a thread, or meeting notes. We draft a case; you review it before saving."/>
      <FieldDescription>{description.length.toLocaleString("en-US")} / {inputLimits.importText.toLocaleString("en-US")} characters. Notes are sent to the AI model once and are not stored until you save the case.</FieldDescription>
    </Field>
    <div className="space-y-2" onDragOver={(event: DragEvent) => event.preventDefault()} onDrop={(event: DragEvent) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}>
      <label className="flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed p-4 text-sm"><span className="font-medium">Add documents (preview)</span><span className="text-muted-foreground">Document parsing — coming soon. Files stay in your browser and are not uploaded or read.</span>
        <input type="file" multiple aria-label="Choose documents" className="sr-only" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }}/></label>
      {fileNames.length > 0 && <ul className="text-sm text-muted-foreground">{fileNames.map((name) => <li key={name}>{name}</li>)}</ul>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="button" disabled={pending || description.trim() === ""} onClick={() => { void draft(); }}>{pending ? "Drafting…" : "Draft case"}</Button>
  </section>;
}
