"use client";
import { useRef, useState } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { Upload } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { inputLimits } from "@/lib/contracts/limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/date-field";
import { FormDialogBody, FormDialogFooter } from "@/components/dialog-frame";
import { FormSection, SourceFields } from "@/components/form-parts";
import { todayIso } from "@/lib/format-date";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { OptionSelect } from "@/components/option-select";
import { BlockPreview } from "./block-preview";
import { documentAreas, documentTypeLabels, documentTypeMeaning } from "./presentation";
import { documentFormSchema, savedDocumentSchema, type DocumentInput } from "./schema";

const typeOptions = Object.entries(documentTypeLabels).map(([value, label]) => ({ value: value as DocumentInput["type"], label: `${label} · ${documentTypeMeaning[value as DocumentInput["type"]]}` }));
const areaOptions = documentAreas.map((value) => ({ value, label: value }));
const maxFileBytes = inputLimits.documentBody * 4;

export function DocumentForm({ initial, documentId, onCancel, onSaved }: { initial?: DocumentInput; documentId?: string; onCancel: () => void; onSaved: (documentId: string) => void }) {
  const [error, setError] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const schema = documentFormSchema(!!documentId);
  // A new version takes effect when published, so an edit starts from today's date and an empty note.
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema), defaultValues: initial ? { ...initial, effectiveFrom: todayIso(), changeNote: "" } : { changeNote: "", title: "", description: "", body: "", type: "procedure", area: "Operations", owner: "", effectiveFrom: todayIso(), sources: [] } });
  const title = useWatch({ control: form.control, name: "title" });
  const body = useWatch({ control: form.control, name: "body" });
  const fileInput = useRef<HTMLInputElement>(null);
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
  return <FormProvider {...form}><form noValidate onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col">
    <FormDialogBody>
      <Field data-invalid={!!errors.title}><FieldLabel htmlFor="document-title">Name</FieldLabel><Input id="document-title" required maxLength={inputLimits.title} aria-invalid={!!errors.title} aria-describedby={errors.title ? "document-title-error" : undefined} {...form.register("title")}/><FieldError id="document-title-error" errors={[errors.title]}/></Field>
      <Field data-invalid={!!errors.description}><FieldLabel htmlFor="document-description">Description</FieldLabel><FieldDescription>Say when to use this document. The agent reads this to decide whether it applies.</FieldDescription><Textarea id="document-description" rows={2} required maxLength={inputLimits.documentDescription} aria-invalid={!!errors.description} aria-describedby={errors.description ? "document-description-error" : undefined} {...form.register("description")}/><FieldError id="document-description-error" errors={[errors.description]}/></Field>
      <FormSection title="Content" description="Paste Markdown, or choose a .md or .txt file. Headings split it into blocks.">
        <Field data-invalid={!!errors.body}><FieldLabel htmlFor="document-body" className="sr-only">Content</FieldLabel><Textarea id="document-body" rows={10} required className="font-mono text-[13px]" aria-invalid={!!errors.body} aria-describedby={errors.body ? "document-body-error" : undefined} {...form.register("body")}/><FieldError id="document-body-error" errors={[errors.body]}/></Field>
        <Field data-invalid={!!fileError}><input ref={fileInput} id="document-file" type="file" tabIndex={-1} aria-label="Choose a file" className="sr-only" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ""; }}/><Button type="button" variant="outline" className="self-start" onClick={() => fileInput.current?.click()}><Upload aria-hidden="true"/>Choose a file</Button>{fileError && <FieldError errors={[{ message: fileError }]}/>}</Field>
        <BlockPreview title={title ?? ""} body={body ?? ""}/>
      </FormSection>
      <FormSection title="Details" description="Tells the agent how binding the document is and who to ask.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field><FieldLabel htmlFor="document-type">Type</FieldLabel><Controller control={form.control} name="type" render={({ field }) => <OptionSelect id="document-type" items={typeOptions} value={field.value} className="w-full" onValueChange={field.onChange}/>}/></Field>
          <Field><FieldLabel htmlFor="document-area">Area</FieldLabel><Controller control={form.control} name="area" render={({ field }) => <OptionSelect id="document-area" items={areaOptions} value={field.value} className="w-full" onValueChange={field.onChange}/>}/></Field>
          <Field data-invalid={!!errors.owner}><FieldLabel htmlFor="document-owner">Owner</FieldLabel><Input id="document-owner" required maxLength={inputLimits.title} aria-invalid={!!errors.owner} aria-describedby={errors.owner ? "document-owner-error" : undefined} {...form.register("owner")}/><FieldError id="document-owner-error" errors={[errors.owner]}/></Field>
          <Field data-invalid={!!errors.effectiveFrom}><FieldLabel htmlFor="document-effective">Effective from</FieldLabel><Controller control={form.control} name="effectiveFrom" render={({ field }) => <DateField id="document-effective" value={field.value} onChange={field.onChange} invalid={!!errors.effectiveFrom} describedBy="document-effective-help"/>}/><FieldDescription id="document-effective-help">Today or earlier.</FieldDescription><FieldError id="document-effective-error" errors={[errors.effectiveFrom]}/></Field>
        </div>
      </FormSection>
      <FormSection title="Sources" description="Reference links are stored with the document. Their contents are not fetched."><SourceFields idPrefix="document-source"/></FormSection>
      {documentId && <FormSection title="This version" description="Saved with the version, so people can see what changed and why. It is not shown to the agent.">
        <Field data-invalid={!!errors.changeNote}><FieldLabel htmlFor="document-change-note">What changed and why</FieldLabel><Textarea id="document-change-note" rows={2} required maxLength={inputLimits.documentChangeNote} aria-invalid={!!errors.changeNote} aria-describedby={errors.changeNote ? "document-change-note-error" : undefined} {...form.register("changeNote")}/><FieldError id="document-change-note-error" errors={[errors.changeNote]}/></Field>
      </FormSection>}
    </FormDialogBody>
    <FormDialogFooter>{error && <p role="alert" className="mr-auto text-sm text-destructive">{error}</p>}<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Publishing…" : documentId ? "Save new version" : "Add document"}</Button></FormDialogFooter>
  </form></FormProvider>;
}
