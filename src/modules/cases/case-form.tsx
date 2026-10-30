"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, useWatch, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { caseInputSchema, type CaseInput } from "./schema";
import { templates } from "./templates";
import { savedCaseSchema } from "./contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel, FieldError, FieldSet, FieldLegend, FieldDescription } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OptionSelect } from "@/components/option-select";
import { outcomeLabels, sectionLabels, templateFields } from "./presentation";
import { Textarea } from "@/components/ui/textarea";
import type { SectionKey } from "./schema";

const common = { title: "", problem: "", context: "", constraints: "", approach: "", observedOutcome: "", lessons: "", outcome: "unknown" as const, sources: [], conceptIds: [] };
const domain = { product_delivery: { deliverable: "", changeScope: "", deploymentConditions: "" }, cs_operations: { customerImpact: "", handlingConditions: "", escalationNotes: "" } };

const outcomeOptions = [{ value: "unknown" as const, label: outcomeLabels.unknown }, { value: "achieved" as const, label: outcomeLabels.achieved }, { value: "not_achieved" as const, label: outcomeLabels.not_achieved }];
const templateOptions = templates.map((item) => ({ value: item.id, label: item.label }));

// One group of related fields. The divider sits on the wrapper so the legend stays a direct child of the fieldset and keeps naming it.
function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <div className="border-t pt-6"><FieldSet className="gap-4"><FieldLegend className="mb-0">{title}</FieldLegend>{description && <FieldDescription className="-mt-2">{description}</FieldDescription>}{children}</FieldSet></div>;
}

export function CaseForm({ initial, caseId, concepts, missing = [], onCancel, onSaved }: { initial?: CaseInput; caseId?: string; concepts: { id: string; label: string }[]; missing?: readonly SectionKey[]; onCancel: () => void; onSaved: (caseId: string) => void }) {
  const [error, setError] = useState<string>();
  const [switchTo, setSwitchTo] = useState<CaseInput["template"] | null>(null);
  const form = useForm<z.input<typeof caseInputSchema>, unknown, CaseInput>({ resolver: zodResolver(caseInputSchema), defaultValues: initial ?? { ...common, template: "product_delivery", ...domain.product_delivery } });
  const template = useWatch({ control: form.control, name: "template" });
  const outcome = useWatch({ control: form.control, name: "outcome" });
  const sources = useFieldArray({ control: form.control, name: "sources" });
  const fields = templateFields[template];
  const { setError: setFieldError } = form;
  useEffect(() => { for (const name of missing) setFieldError(name, { type: "required", message: "Not found in your notes. Add it before saving." }); }, [missing, setFieldError]);
  function filledFields() { const values: Record<string, unknown> = form.getValues(); return fields.filter((key) => typeof values[key] === "string" && /\S/.test(values[key])); }
  function applyTemplate(choice: CaseInput["template"]) { const { title, problem, context, constraints, approach, observedOutcome, lessons, outcome, sources, conceptIds } = form.getValues(); const core = { title, problem, context, constraints, approach, observedOutcome, lessons, outcome, sources, conceptIds }; form.reset(choice === "product_delivery" ? { ...core, template: choice, ...domain.product_delivery } : { ...core, template: choice, ...domain.cs_operations }); }
  function chooseTemplate(choice: CaseInput["template"]) { if (choice === template) return; if (filledFields().length > 0) setSwitchTo(choice); else applyTemplate(choice); }
  async function submit(input: CaseInput) {
    setError(undefined);
    try {
      const response = await fetch(caseId ? `/api/cases/${caseId}` : "/api/cases", { method: caseId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const raw: unknown = await response.json();
      if (!response.ok) { const parsed = z.object({ error: z.string() }).safeParse(raw); setError(parsed.success ? parsed.data.error : "Could not save case."); return; }
      onSaved(savedCaseSchema.parse(raw).caseId);
    } catch { setError("Cannot confirm save. Check the case library before trying again."); }
  }
  const groups = [
    { title: "Core experience", description: "What happened, and how you approached it.", fields: ["problem", "context", "constraints", "approach"] as const },
    { title: template === "product_delivery" ? "Delivery conditions" : "Customer and operations", description: "Optional details that explain when the approach applies.", fields },
    { title: "Outcome and lessons", description: "Separate observed results from what you would try next.", fields: ["observedOutcome", "lessons"] as const },
  ];
  return <form noValidate onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col">
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
    <Field><FieldLabel htmlFor="case-template">Template</FieldLabel><Controller control={form.control} name="template" render={({ field }) => <OptionSelect id="case-template" items={templateOptions} value={field.value} disabled={!form.formState.isReady} className="w-full" onValueChange={chooseTemplate}/>}/></Field>
    <Field data-invalid={!!form.formState.errors.title}><FieldLabel htmlFor="title">Title</FieldLabel><Input id="title" required maxLength={200} aria-invalid={!!form.formState.errors.title} aria-describedby={form.formState.errors.title ? "title-error" : undefined} {...form.register("title")}/><FieldError id="title-error" errors={[form.formState.errors.title]}/></Field>
    {groups.map((group) => <FormSection key={group.title} title={group.title} description={group.description}>
      {group.title === "Outcome and lessons" && <Field><FieldLabel htmlFor="outcome">Outcome</FieldLabel><Controller control={form.control} name="outcome" render={({ field }) => <OptionSelect id="outcome" items={outcomeOptions} value={field.value} className="w-full" onValueChange={field.onChange}/>}/></Field>}
      {group.fields.map((name) => { const fieldError = form.getFieldState(name, form.formState).error; const required = ["problem", "context", "approach"].includes(name) || (name === "observedOutcome" && outcome !== "unknown"); return <Field key={name} data-invalid={!!fieldError}><FieldLabel htmlFor={name}>{sectionLabels[name]}{!required && <span aria-hidden="true" className="font-normal text-muted-foreground">Optional</span>}</FieldLabel><Textarea id={name} aria-label={sectionLabels[name]} rows={3} required={required} maxLength={4000} aria-invalid={!!fieldError} aria-describedby={fieldError ? `${name}-error` : undefined} {...form.register(name)}/><FieldError id={`${name}-error`} errors={[fieldError]}/></Field>; })}
    </FormSection>)}
    <FormSection title="Sources and classification" description="Reference links are stored with the case. Their contents are not fetched.">
      <FieldSet className="gap-2"><FieldLegend variant="label">Concepts</FieldLegend>{concepts.length === 0 && <p className="text-sm text-muted-foreground">No concepts in this workspace yet.</p>}<Controller control={form.control} name="conceptIds" render={({ field }) => <div className="flex flex-wrap gap-x-5 gap-y-2">{concepts.map((concept) => <div key={concept.id} className="inline-flex items-center gap-2 text-sm"><Checkbox id={`concept-${concept.id}`} checked={field.value?.includes(concept.id) ?? false} onCheckedChange={(checked) => field.onChange(checked ? [...(field.value ?? []), concept.id] : (field.value ?? []).filter((id) => id !== concept.id))}/><Label htmlFor={`concept-${concept.id}`} className="font-normal">{concept.label}</Label></div>)}</div>}/></FieldSet>
      <div className="space-y-4">{sources.fields.map((source, index) => <div key={source.id} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]"><Field><FieldLabel htmlFor={`source-label-${index}`}>Source {index + 1} label</FieldLabel><Input id={`source-label-${index}`} required aria-invalid={!!form.formState.errors.sources?.[index]?.label} {...form.register(`sources.${index}.label`)}/><FieldError errors={[form.formState.errors.sources?.[index]?.label]}/></Field><Field><FieldLabel htmlFor={`source-url-${index}`}>Source {index + 1} URL</FieldLabel><Input id={`source-url-${index}`} type="url" required aria-invalid={!!form.formState.errors.sources?.[index]?.url} {...form.register(`sources.${index}.url`)}/><FieldError errors={[form.formState.errors.sources?.[index]?.url]}/></Field><Button className="sm:mt-7" type="button" variant="ghost" onClick={() => sources.remove(index)}>Remove</Button></div>)}<Button type="button" variant="outline" disabled={sources.fields.length >= 12} onClick={() => sources.append({ label: "", url: "" })}>Add source</Button><FieldError errors={[form.formState.errors.sources]}/></div>
    </FormSection>
    </div>
    <div className="flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">{error && <p role="alert" className="mr-auto text-sm text-destructive">{error}</p>}<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save case"}</Button></div>
    <Dialog open={switchTo !== null} onOpenChange={(next) => { if (!next) setSwitchTo(null); }}><DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle className="text-base">Switch to {templates.find((item) => item.id === switchTo)?.label}?</DialogTitle><DialogDescription>These fields belong to the current template and will be cleared: {filledFields().map((key) => sectionLabels[key]).join(", ")}. Everything else stays.</DialogDescription></DialogHeader>
      <DialogFooter><Button type="button" variant="outline" onClick={() => setSwitchTo(null)}>Keep current template</Button><Button type="button" variant="destructive" onClick={() => { if (switchTo) applyTemplate(switchTo); setSwitchTo(null); }}>Switch and clear</Button></DialogFooter>
    </DialogContent></Dialog>
  </form>;
}
