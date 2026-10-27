"use client";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requestSchema, type NormalizedRequest } from "@/modules/analysis/schema";
import { inputLimits } from "@/lib/contracts/limits";
import { templates } from "@/modules/cases/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const responseSchema = z.object({ error: z.string() });
export function RequestForm() {
  const [message, setMessage] = useState<string>();
  const form = useForm<NormalizedRequest>({ resolver: zodResolver(requestSchema), defaultValues: { template: "product_delivery", version: 1, objective: "", context: "", hardConstraints: [], conceptIds: [], unknowns: "" } });
  const constraints = useFieldArray({ control: form.control, name: "hardConstraints" });
  async function submit(values: NormalizedRequest) {
    setMessage(undefined);
    try {
      const response = await fetch("/api/analyses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const raw: unknown = await response.json();
      const parsed = responseSchema.safeParse(raw);
      setMessage(parsed.success ? parsed.data.error : "Analysis is not available yet.");
    } catch { setMessage("Cannot connect. Your request has not been saved."); }
  }
  return <form onSubmit={form.handleSubmit(submit)} className="space-y-7">
    <div className="space-y-2"><Label htmlFor="template">Request type</Label><Controller control={form.control} name="template" render={({ field }) => <Select items={templates.map((template) => ({ value: template.id, label: template.label }))} value={field.value} onValueChange={field.onChange}><SelectTrigger id="template" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.label}</SelectItem>)}</SelectContent></Select>}/></div>
    <div className="space-y-2"><Label htmlFor="objective">What do you want to achieve?</Label><Input id="objective" required maxLength={inputLimits.text} {...form.register("objective")} placeholder="Describe the outcome you need"/>{form.formState.errors.objective && <p className="text-sm text-destructive">Enter an objective.</p>}</div>
    <div className="space-y-2"><Label htmlFor="context">Context</Label><Textarea id="context" required rows={5} maxLength={inputLimits.text} {...form.register("context")} placeholder="Who is affected? What is happening, and what have you tried?"/>{form.formState.errors.context && <p className="text-sm text-destructive">Add the context for this request.</p>}</div>
    <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Hard constraints</legend><p className="text-sm text-muted-foreground">Requirements that a proposed approach must respect.</p>{constraints.fields.map((item, index) => <div key={item.id} className="flex items-center gap-2"><Input aria-label={`Constraint ${index + 1}`} maxLength={inputLimits.text} required {...form.register(`hardConstraints.${index}.text`)} placeholder="e.g. Keep the existing sign-in flow"/><Button type="button" variant="ghost" onClick={() => constraints.remove(index)} aria-label={`Remove constraint ${index + 1}`}>Remove</Button></div>)}<Button type="button" variant="outline" disabled={constraints.fields.length >= inputLimits.hardConstraints} onClick={() => constraints.append({ kind: "requirement", text: "" })}>Add constraint</Button><p className="text-xs text-muted-foreground">{constraints.fields.length} / {inputLimits.hardConstraints} constraints</p></fieldset>
    <div className="space-y-2"><Label htmlFor="unknowns">What is still unknown?</Label><Textarea id="unknowns" rows={3} maxLength={inputLimits.text} {...form.register("unknowns")} placeholder="Questions or missing facts that could change the approach"/></div>
    <p className="text-sm text-muted-foreground">No concepts available yet. Analysis is not connected; this form does not save your request.</p>
    <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Checking…" : "Check request"}</Button>
    {message && <p role="status" className="rounded-lg border p-4 text-sm leading-6">{message}</p>}
  </form>;
}
