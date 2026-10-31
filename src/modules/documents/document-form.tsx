"use client";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { inputLimits } from "@/lib/contracts/limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { OptionSelect } from "@/components/option-select";
import { BlockPreview } from "./block-preview";
import { documentAreas, documentTypeLabels, documentTypeMeaning } from "./presentation";
import { documentFormSchema, savedDocumentSchema, type DocumentInput } from "./schema";

const typeOptions = Object.entries(documentTypeLabels).map(([value, label]) => ({ value: value as DocumentInput["type"], label: `${label} · ${documentTypeMeaning[value as DocumentInput["type"]]}` }));
const areaOptions = documentAreas.map((value) => ({ value, label: value }));
const maxFileBytes = inputLimits.documentBody * 4;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <div className="border-t pt-6"><FieldSet className="gap-4"><FieldLegend className="mb-0">{title}</FieldLegend>{description && <FieldDescription className="-mt-2">{description}</FieldDescription>}{children}</FieldSet></div>;
}

export function DocumentForm({ initial, documentId, onCancel, onSaved }: { initial?: DocumentInput; documentId?: string; onCancel: () => void; onSaved: (documentId: string) => void }) {
  const [error, setError] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const schema = documentFormSchema(!!documentId);
  // A new version takes effect when published, so an edit starts from today's date and an empty note.
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema), defaultValues: initial ? { ...initial, effectiveFrom: new Date().toISOString().slice(0, 10), changeNote: "" } : { changeNote: "", title: "", description: "", body: "", type: "procedure", area: "Operations", owner: "", effectiveFrom: new Date().toISOString().slice(0, 10), sources: [] } });
  const title = useWatch({ control: form.control, name: "title" });
  const body = useWatch({ control: form.control, name: "body" });
  const sources = useFieldArray({ control: form.control, name: "sources" });
  const errors = form.formState.errors;
  async function readFile(file: File | undefined) {
    setFileError(undefined);
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) { setFileError("Choose a .md or .txt file."); return; }
    if (file.size > maxFileBytes) { setFileError("That file is too large for one document."); return; }
    // The file is read in the browser; only the text you save is sent.
    form.setValue("body", await file.text(), { shouldDirty: true, shouldValidate: true });
    if (!form.getValues("title")) form.setValue("title", file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), { shouldDirty: true });
  }
  async function submit(input: z.output<typeof schema>) {
    setError(undefined);
    try {
      const response = await fetch(documentId ? `/api/documents/${documentId}` : "/api/documents", { method: documentId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const raw: unknown = await response.json();
      if (!response.ok) { const parsed = z.object({ error: z.string() }).safeParse(raw); setError(parsed.success ? parsed.data.error : "Could not save the document."); return; }
      onSaved(savedDocumentSchema.parse(raw).documentId);
    } catch { setError("Cannot confirm save. Check the document list before trying again."); }
  }
  return <form noValidate onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col">
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
      <Field data-invalid={!!errors.title}><FieldLabel htmlFor="document-title">Name</FieldLabel><Input id="document-title" required maxLength={inputLimits.title} aria-invalid={!!errors.title} aria-describedby={errors.title ? "document-title-error" : undefined} {...form.register("title")}/><FieldError id="document-title-error" errors={[errors.title]}/></Field>
      <Field data-invalid={!!errors.description}><FieldLabel htmlFor="document-description">Description</FieldLabel><FieldDescription>Say when to use this document. The agent reads this to decide whether it applies.</FieldDescription><Textarea id="document-description" rows={2} required maxLength={inputLimits.documentDescription} aria-invalid={!!errors.description} aria-describedby={errors.description ? "document-description-error" : undefined} {...form.register("description")}/><FieldError id="document-description-error" errors={[errors.description]}/></Field>
      <Section title="Content" description="Paste Markdown, or choose a .md or .txt file. Headings split it into blocks.">
        <Field data-invalid={!!errors.body}><FieldLabel htmlFor="document-body">Content</FieldLabel><Textarea id="document-body" rows={10} required className="font-mono text-[13px]" aria-invalid={!!errors.body} aria-describedby={errors.body ? "document-body-error" : undefined} {...form.register("body")}/><FieldError id="document-body-error" errors={[errors.body]}/></Field>
        <Field data-invalid={!!fileError}><FieldLabel htmlFor="document-file">Or choose a file</FieldLabel><Input id="document-file" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ""; }}/>{fileError && <FieldError errors={[{ message: fileError }]}/>}</Field>
        <BlockPreview title={title ?? ""} body={body ?? ""}/>
      </Section>
      <Section title="Details" description="Tells the agent how binding the document is and who to ask.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field><FieldLabel htmlFor="document-type">Type</FieldLabel><Controller control={form.control} name="type" render={({ field }) => <OptionSelect id="document-type" items={typeOptions} value={field.value} className="w-full" onValueChange={field.onChange}/>}/></Field>
          <Field><FieldLabel htmlFor="document-area">Area</FieldLabel><Controller control={form.control} name="area" render={({ field }) => <OptionSelect id="document-area" items={areaOptions} value={field.value} className="w-full" onValueChange={field.onChange}/>}/></Field>
          <Field data-invalid={!!errors.owner}><FieldLabel htmlFor="document-owner">Owner</FieldLabel><Input id="document-owner" required maxLength={inputLimits.title} aria-invalid={!!errors.owner} aria-describedby={errors.owner ? "document-owner-error" : undefined} {...form.register("owner")}/><FieldError id="document-owner-error" errors={[errors.owner]}/></Field>
          <Field data-invalid={!!errors.effectiveFrom}><FieldLabel htmlFor="document-effective">Effective from</FieldLabel><FieldDescription>Today or earlier. A new version replaces the current one when saved.</FieldDescription><Input id="document-effective" type="date" required aria-invalid={!!errors.effectiveFrom} aria-describedby={errors.effectiveFrom ? "document-effective-error" : undefined} {...form.register("effectiveFrom")}/><FieldError id="document-effective-error" errors={[errors.effectiveFrom]}/></Field>
        </div>
        <div className="space-y-4">{sources.fields.map((source, index) => <div key={source.id} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]"><Field><FieldLabel htmlFor={`document-source-label-${index}`}>Source {index + 1} label</FieldLabel><Input id={`document-source-label-${index}`} required aria-invalid={!!errors.sources?.[index]?.label} {...form.register(`sources.${index}.label`)}/><FieldError errors={[errors.sources?.[index]?.label]}/></Field><Field><FieldLabel htmlFor={`document-source-url-${index}`}>Source {index + 1} URL</FieldLabel><Input id={`document-source-url-${index}`} type="url" required aria-invalid={!!errors.sources?.[index]?.url} {...form.register(`sources.${index}.url`)}/><FieldError errors={[errors.sources?.[index]?.url]}/></Field><Button className="sm:mt-7" type="button" variant="ghost" onClick={() => sources.remove(index)}>Remove</Button></div>)}<Button type="button" variant="outline" disabled={sources.fields.length >= 12} onClick={() => sources.append({ label: "", url: "" })}>Add source</Button></div>
      </Section>
      {documentId && <Section title="This version" description="Saved with the version, so people can see what changed and why. It is not shown to the agent.">
        <Field data-invalid={!!errors.changeNote}><FieldLabel htmlFor="document-change-note">What changed and why</FieldLabel><Textarea id="document-change-note" rows={2} required maxLength={inputLimits.documentChangeNote} aria-invalid={!!errors.changeNote} aria-describedby={errors.changeNote ? "document-change-note-error" : undefined} {...form.register("changeNote")}/><FieldError id="document-change-note-error" errors={[errors.changeNote]}/></Field>
      </Section>}
    </div>
    <div className="flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">{error && <p role="alert" className="mr-auto text-sm text-destructive">{error}</p>}<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Publishing…" : documentId ? "Save new version" : "Add document"}</Button></div>
  </form>;
}
