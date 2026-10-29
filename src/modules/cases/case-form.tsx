"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { caseInputSchema, type CaseInput } from "./schema";
import { templates } from "./templates";
import { savedCaseSchema } from "./contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldSet, FieldLegend, FieldDescription } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { sectionLabels } from "./presentation";
import { Textarea } from "@/components/ui/textarea";

const common = { title: "", problem: "", context: "", constraints: "", approach: "", observedOutcome: "", lessons: "", outcome: "unknown" as const, sources: [], conceptIds: [] };
const domain = { product_delivery: { deliverable: "", changeScope: "", deploymentConditions: "" }, cs_operations: { customerImpact: "", handlingConditions: "", escalationNotes: "" } };

export function CaseForm({ initial, caseId, concepts }: { initial?: CaseInput; caseId?: string; concepts: { id: string; label: string }[] }) {
  const router = useRouter(); const [error, setError] = useState<string>();
  const form = useForm<z.input<typeof caseInputSchema>, unknown, CaseInput>({ resolver: zodResolver(caseInputSchema), defaultValues: initial ?? { ...common, template: "product_delivery", ...domain.product_delivery } });
  const template = useWatch({ control: form.control, name: "template" });
  const outcome = useWatch({ control: form.control, name: "outcome" });
  const sources = useFieldArray({ control: form.control, name: "sources" });
  const fields = template === "product_delivery" ? ["deliverable", "changeScope", "deploymentConditions"] as const : ["customerImpact", "handlingConditions", "escalationNotes"] as const;
  async function submit(input: CaseInput) {
    setError(undefined);
    try {
      const response = await fetch(caseId ? `/api/cases/${caseId}` : "/api/cases", { method: caseId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const raw: unknown = await response.json();
      if (!response.ok) { const parsed = z.object({ error: z.string() }).safeParse(raw); setError(parsed.success ? parsed.data.error : "Could not save case."); return; }
      const saved = savedCaseSchema.parse(raw); router.push(`/workspace/knowledge/${saved.caseId}`); router.refresh();
    } catch { setError("Cannot confirm save. Check the case library before trying again."); }
  }
  const groups = [
    { title: "Core experience", description: "What happened, and how you approached it.", fields: ["problem", "context", "constraints", "approach"] as const },
    { title: template === "product_delivery" ? "Delivery conditions" : "Customer and operations", description: "Optional details that explain when the approach applies.", fields },
    { title: "Outcome and lessons", description: "Separate observed results from what you would try next.", fields: ["observedOutcome", "lessons"] as const },
  ];
  return <form noValidate onSubmit={form.handleSubmit(submit)} className="space-y-9">
    <Field><FieldLabel htmlFor="case-template">Template</FieldLabel><NativeSelect id="case-template" disabled={!form.formState.isReady} value={template} onChange={(event) => { const choice = event.target.value === "cs_operations" ? "cs_operations" : "product_delivery"; const { title, problem, context, constraints, approach, observedOutcome, lessons, outcome, sources, conceptIds } = form.getValues(); const core = { title, problem, context, constraints, approach, observedOutcome, lessons, outcome, sources, conceptIds }; form.reset(choice === "product_delivery" ? { ...core, template: choice, ...domain.product_delivery } : { ...core, template: choice, ...domain.cs_operations }); }}>{templates.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.label}</NativeSelectOption>)}</NativeSelect></Field>
    <Field data-invalid={!!form.formState.errors.title}><FieldLabel htmlFor="title">Title</FieldLabel><Input id="title" required maxLength={200} aria-invalid={!!form.formState.errors.title} aria-describedby={form.formState.errors.title ? "title-error" : undefined} {...form.register("title")}/><FieldError id="title-error" errors={[form.formState.errors.title]}/></Field>
    {groups.map((group) => <FieldSet key={group.title} className="gap-5 border-t pt-7"><div><FieldLegend className="mb-1">{group.title}</FieldLegend><FieldDescription>{group.description}</FieldDescription></div>
      {group.title === "Outcome and lessons" && <Field><FieldLabel htmlFor="outcome">Outcome</FieldLabel><NativeSelect id="outcome" {...form.register("outcome")}><NativeSelectOption value="unknown">Unknown</NativeSelectOption><NativeSelectOption value="achieved">Achieved</NativeSelectOption><NativeSelectOption value="not_achieved">Not achieved</NativeSelectOption></NativeSelect></Field>}
      {group.fields.map((name) => { const fieldError = form.getFieldState(name, form.formState).error; const required = ["problem", "context", "approach"].includes(name) || (name === "observedOutcome" && outcome !== "unknown"); return <Field key={name} data-invalid={!!fieldError}><FieldLabel htmlFor={name}>{sectionLabels[name]}{!required && <span aria-hidden="true" className="font-normal text-muted-foreground">Optional</span>}</FieldLabel><Textarea id={name} aria-label={sectionLabels[name]} rows={3} required={required} maxLength={4000} aria-invalid={!!fieldError} aria-describedby={fieldError ? `${name}-error` : undefined} {...form.register(name)}/><FieldError id={`${name}-error`} errors={[fieldError]}/></Field>; })}
    </FieldSet>)}
    <FieldSet className="border-t pt-7"><FieldLegend>Sources and classification</FieldLegend><FieldDescription>Reference links are stored with the case. Their contents are not fetched.</FieldDescription>
      <FieldSet className="gap-2"><FieldLegend variant="label">Concepts</FieldLegend>{concepts.length === 0 && <p className="text-sm text-muted-foreground">No concepts in this workspace yet.</p>}<div className="flex flex-wrap gap-x-5 gap-y-2">{concepts.map((concept) => <label key={concept.id} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" value={concept.id} {...form.register("conceptIds")}/>{concept.label}</label>)}</div></FieldSet>
      <div className="space-y-4">{sources.fields.map((source, index) => <div key={source.id} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]"><Field><FieldLabel htmlFor={`source-label-${index}`}>Source {index + 1} label</FieldLabel><Input id={`source-label-${index}`} required aria-invalid={!!form.formState.errors.sources?.[index]?.label} {...form.register(`sources.${index}.label`)}/><FieldError errors={[form.formState.errors.sources?.[index]?.label]}/></Field><Field><FieldLabel htmlFor={`source-url-${index}`}>Source {index + 1} URL</FieldLabel><Input id={`source-url-${index}`} type="url" required aria-invalid={!!form.formState.errors.sources?.[index]?.url} {...form.register(`sources.${index}.url`)}/><FieldError errors={[form.formState.errors.sources?.[index]?.url]}/></Field><Button className="sm:mt-7" type="button" variant="ghost" onClick={() => sources.remove(index)}>Remove</Button></div>)}<Button type="button" variant="outline" disabled={sources.fields.length >= 12} onClick={() => sources.append({ label: "", url: "" })}>Add source</Button><FieldError errors={[form.formState.errors.sources]}/></div>
    </FieldSet>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="border-t pt-6"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving and indexing…" : "Save case"}</Button></div>
  </form>;
}
