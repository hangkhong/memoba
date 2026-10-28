"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseJsonEventStream, uiMessageChunkSchema } from "ai";
import { eventSchema, type AnalysisEvent } from "@/modules/analysis/events";
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
export function RequestForm({ concepts = [] }: { concepts?: { id: string; label: string }[] }) {
  const router = useRouter(); const [events, setEvents] = useState<AnalysisEvent[]>([]); const [runId, setRunId] = useState<string>();
  const controller = useRef<AbortController | null>(null); const requestKey = useRef<string | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const [message, setMessage] = useState<string>();
  const form = useForm<NormalizedRequest>({ resolver: zodResolver(requestSchema), defaultValues: { template: "product_delivery", version: 1, objective: "", context: "", hardConstraints: [], conceptIds: [], unknowns: "" } });
  const constraints = useFieldArray({ control: form.control, name: "hardConstraints" });
  async function submit(values: NormalizedRequest) {
    setMessage(undefined); setEvents([]); controller.current = new AbortController();
    requestKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/analyses", { method: "POST", signal: controller.current.signal, headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey.current }, body: JSON.stringify(values) });
      if (!response.ok) {
        const raw: unknown = await response.json(); const parsed = responseSchema.safeParse(raw); setMessage(parsed.success ? parsed.data.error : "Analysis unavailable.");
        const duplicate = z.object({ runId: z.uuid() }).safeParse(raw); if (duplicate.success) { setRunId(duplicate.data.runId); router.push(`/workspace/analyses/${duplicate.data.runId}`); }
        return;
      }
      const id = z.uuid().parse(response.headers.get("X-Run-Id")); setRunId(id);
      if (!response.body) throw Error("Stream unavailable");
      const reader = parseJsonEventStream({ stream: response.body, schema: uiMessageChunkSchema }).getReader();
      while (true) {
        const { done, value: chunk } = await reader.read(); if (done) break;
        if (!chunk.success) continue;
        if (chunk.value.type === "data-activity") { const event = eventSchema.parse(chunk.value.data); setEvents((current) => [...current, event]); }
        if (chunk.value.type === "data-result") router.push(`/workspace/analyses/${id}`);
      }
      setMessage("Run finished. Open its saved state for the result.");
    } catch { setMessage("Connection interrupted. Open the saved run if available; generation does not automatically resume."); }
  }
  return <form onSubmit={(event) => { void form.handleSubmit(submit)(event); }} className="space-y-7">
    <div className="space-y-2"><Label htmlFor="template">Request type</Label><Controller control={form.control} name="template" render={({ field }) => <Select items={templates.map((template) => ({ value: template.id, label: template.label }))} value={field.value} onValueChange={field.onChange}><SelectTrigger id="template" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.label}</SelectItem>)}</SelectContent></Select>}/></div>
    <div className="space-y-2"><Label htmlFor="objective">What do you want to achieve?</Label><Input id="objective" required maxLength={inputLimits.text} {...form.register("objective")} placeholder="Describe the outcome you need"/>{form.formState.errors.objective && <p className="text-sm text-destructive">Enter an objective.</p>}</div>
    <div className="space-y-2"><Label htmlFor="context">Context</Label><Textarea id="context" required rows={5} maxLength={inputLimits.text} {...form.register("context")} placeholder="Who is affected? What is happening, and what have you tried?"/>{form.formState.errors.context && <p className="text-sm text-destructive">Add the context for this request.</p>}</div>
    <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Hard constraints</legend><p className="text-sm text-muted-foreground">Requirements that a proposed approach must respect.</p>{constraints.fields.map((item, index) => <div key={item.id} className="flex items-center gap-2"><select aria-label={`Constraint ${index + 1} type`} className="rounded border p-2" {...form.register(`hardConstraints.${index}.kind`)}><option value="requirement">Required</option><option value="prohibition">Prohibited</option></select><Input aria-label={`Constraint ${index + 1}`} maxLength={inputLimits.text} required {...form.register(`hardConstraints.${index}.text`)} placeholder="e.g. Keep the existing sign-in flow"/><Button type="button" variant="ghost" onClick={() => constraints.remove(index)} aria-label={`Remove constraint ${index + 1}`}>Remove</Button></div>)}<Button type="button" variant="outline" disabled={constraints.fields.length >= inputLimits.hardConstraints} onClick={() => constraints.append({ kind: "requirement", text: "" })}>Add constraint</Button><p className="text-xs text-muted-foreground">{constraints.fields.length} / {inputLimits.hardConstraints} constraints</p></fieldset>
    <div className="space-y-2"><Label htmlFor="unknowns">What is still unknown?</Label><Textarea id="unknowns" rows={3} maxLength={inputLimits.text} {...form.register("unknowns")} placeholder="Questions or missing facts that could change the approach"/></div>
    <fieldset><legend className="text-sm font-medium">Concepts</legend>{concepts.length === 0 && <p className="text-sm text-muted-foreground">No concepts available yet.</p>}{concepts.map((concept) => <label key={concept.id} className="mr-4 inline-flex gap-2 py-2"><input type="checkbox" value={concept.id} {...form.register("conceptIds")}/>{concept.label}</label>)}</fieldset>
    <Button type="submit" disabled={form.formState.isSubmitting || !!runId}>{form.formState.isSubmitting ? "Analysing…" : "Create Reuse Brief"}</Button>
    {form.formState.isSubmitting && <Button type="button" variant="outline" onClick={() => controller.current?.abort()}>Cancel analysis</Button>}
    {runId && <Link className="ml-4 underline" href={`/workspace/analyses/${runId}`}>Open saved run</Link>}
    <ol aria-label="Analysis activity" className="space-y-2">{events.map((event,index) => <li key={index} className="text-sm">{event.stage}{event.tool ? ` · ${event.tool}` : ""} · {event.state}{event.count === undefined ? "" : ` · ${event.count} items`}</li>)}</ol>
    {message && <p role="status" className="rounded-lg border p-4 text-sm leading-6">{message}</p>}
  </form>;
}
