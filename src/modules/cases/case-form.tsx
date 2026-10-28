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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const common = { title: "", problem: "", context: "", constraints: "", approach: "", observedOutcome: "", lessons: "", outcome: "unknown" as const, sources: [], conceptIds: [] };
const domain = { product_delivery: { deliverable: "", changeScope: "", deploymentConditions: "" }, cs_operations: { customerImpact: "", handlingConditions: "", escalationNotes: "" } };
const labels = { problem: "Problem / objective", context: "Context", constraints: "Constraints", approach: "Approach and reasoning", observedOutcome: "Observed outcome", lessons: "Lessons and applicability", deliverable: "Deliverable", changeScope: "Change scope", deploymentConditions: "Deployment conditions", customerImpact: "Customer impact", handlingConditions: "Handling conditions", escalationNotes: "Escalation notes" };
export function CaseForm({ initial, caseId, concepts }: { initial?: CaseInput; caseId?: string; concepts: { id: string; label: string }[] }) {
  const router = useRouter(); const [error, setError] = useState<string>();
  const form = useForm<CaseInput>({ resolver: zodResolver(caseInputSchema), defaultValues: initial ?? { ...common, template: "product_delivery", ...domain.product_delivery } });
  const template = useWatch({ control: form.control, name: "template" });
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
  return <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
    <div><Label htmlFor="case-template">Template</Label><select id="case-template" className="mt-2 block w-full rounded border p-2" value={template} onChange={(event) => { const choice = event.target.value === "cs_operations" ? "cs_operations" : "product_delivery"; const current = form.getValues(); const { title, problem, context, constraints, approach, observedOutcome, lessons, outcome, sources, conceptIds } = current; const core = { title, problem, context, constraints, approach, observedOutcome, lessons, outcome, sources, conceptIds }; form.reset(choice === "product_delivery" ? { ...core, template: choice, ...domain.product_delivery } : { ...core, template: choice, ...domain.cs_operations }); }}>{templates.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
    <div><Label htmlFor="title">Title</Label><Input id="title" required maxLength={200} {...form.register("title")}/></div>
    {([...(["problem", "context", "constraints", "approach", "observedOutcome", "lessons"] as const), ...fields]).map((name) => <div key={name}><Label htmlFor={name}>{labels[name]}</Label><Textarea id={name} required maxLength={4000} {...form.register(name)}/></div>)}
    <div><Label htmlFor="outcome">Outcome</Label><select id="outcome" className="mt-2 block w-full rounded border p-2" {...form.register("outcome")}><option value="unknown">Unknown</option><option value="achieved">Achieved</option><option value="not_achieved">Not achieved</option></select></div>
    <fieldset><legend className="text-sm font-medium">Concepts</legend>{concepts.length === 0 && <p className="text-sm text-muted-foreground">No concepts in this workspace yet.</p>}{concepts.map((concept) => <label key={concept.id} className="mr-4 inline-flex gap-2 py-2"><input type="checkbox" value={concept.id} {...form.register("conceptIds")}/>{concept.label}</label>)}</fieldset>
    <fieldset className="space-y-3"><legend className="text-sm font-medium">Source references</legend><p className="text-sm text-muted-foreground">Links are references. Their contents are not fetched.</p>{sources.fields.map((source, index) => <div key={source.id} className="flex gap-2"><Input aria-label={`Source ${index + 1} label`} required {...form.register(`sources.${index}.label`)}/><Input aria-label={`Source ${index + 1} URL`} type="url" required {...form.register(`sources.${index}.url`)}/><Button type="button" variant="ghost" onClick={() => sources.remove(index)}>Remove</Button></div>)}<Button type="button" variant="outline" disabled={sources.fields.length >= 12} onClick={() => sources.append({ label: "", url: "" })}>Add source</Button></fieldset>
    {Object.keys(form.formState.errors).length > 0 && <p role="alert">Review the required fields and source URLs.</p>}
    {error && <p role="alert">{error}</p>}<Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving and indexing…" : "Save case"}</Button>
  </form>;
}
