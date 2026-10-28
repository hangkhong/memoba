"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, Plus } from "lucide-react";
import { inputLimits } from "@/lib/contracts/limits";
import { requestSchema, type NormalizedRequest } from "@/modules/analysis/schema";
import { templates } from "@/modules/cases/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChatSession } from "./chat-session";
import { turnInputSchema } from "./schema";
const composerSchema = turnInputSchema.pick({ message: true, request: true });
type Values = z.infer<typeof composerSchema>;
const emptyRequest: NormalizedRequest = { template: "product_delivery", version: 1, objective: "New question", context: "", hardConstraints: [], conceptIds: [], unknowns: "" };
const errorSchema = z.object({ error: z.string() });
export function Composer({ conversationId, parentTurnId = null, initial = emptyRequest, concepts, disabled = false }: { conversationId?: string; parentTurnId?: string | null; initial?: NormalizedRequest; concepts: { id: string; label: string }[]; disabled?: boolean }) {
  const router = useRouter(); const session = useChatSession();
  const [error, setError] = useState(""); const [detailsOpen, setDetailsOpen] = useState(false);
  const pending = useRef<{ conversationId: string; turnKey: string } | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(composerSchema), defaultValues: { message: "", request: initial } });
  const constraints = useFieldArray({ control: form.control, name: "request.hardConstraints" });
  async function submit(values: Values) {
    setError("");
    pending.current ??= { conversationId: conversationId ?? crypto.randomUUID(), turnKey: crypto.randomUUID() };
    const attempt = pending.current;
    try {
      if (!conversationId) {
        const created = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: attempt.conversationId }) });
        if (!created.ok) { const parsed = errorSchema.safeParse(await created.json()); setError(parsed.success ? parsed.data.error : "Could not create conversation."); return; }
      }
      const response = await fetch(`/api/conversations/${attempt.conversationId}/turns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: attempt.turnKey, parentTurnId, message: values.message, request: requestSchema.parse(values.request) }) });
      const raw: unknown = await response.json();
      if (!response.ok) { const parsed = errorSchema.safeParse(raw); setError(parsed.success ? parsed.data.error : "Could not save your question."); return; }
      const { turnId } = z.object({ turnId: z.uuid() }).parse(raw);
      pending.current = null;
      form.reset({ message: "", request: values.request });
      // The shared layout owns the stream across this navigation.
      void session.start(attempt.conversationId, turnId, attempt.turnKey);
      router.push(`/workspace/chat/${attempt.conversationId}`); router.refresh();
    } catch { setError("Could not send your question. Your input is still here; try again."); }
  }
  return <form onSubmit={(event) => { void form.handleSubmit(submit, () => setDetailsOpen(true))(event); }} className="rounded-2xl border bg-background p-4 shadow-sm">
    <Label htmlFor="question">{parentTurnId ? "Follow-up question" : "What do you want to achieve?"}</Label>
    <Textarea id="question" rows={3} className="mt-2 resize-y border-0 shadow-none focus-visible:ring-0" placeholder={parentTurnId ? "Add context or ask how to adapt the approach…" : "Ask about a decision, a problem, or your next step…"} maxLength={inputLimits.text} {...form.register("message")}/>
    {form.formState.errors.message && <p className="text-sm text-destructive">Enter your question.</p>}
    <details open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)} className="my-3 border-t pt-3"><summary className="cursor-pointer text-sm text-muted-foreground">Request details · context and constraints</summary><div className="mt-4 space-y-4">
      {parentTurnId && <div><Label htmlFor="objective">Objective</Label><Input id="objective" {...form.register("request.objective")} maxLength={inputLimits.text}/></div>}
      <div><Label htmlFor="context">Context</Label><Textarea id="context" rows={3} placeholder="Who is affected, what is happening, and what have you tried?" maxLength={inputLimits.text} {...form.register("request.context")}/>{form.formState.errors.request?.context && <p className="text-sm text-destructive">Add context before sending.</p>}</div>
      <div><Label htmlFor="template">Request type</Label><Controller control={form.control} name="request.template" render={({ field }) => <Select items={templates.map((item) => ({ value: item.id, label: item.label }))} value={field.value} onValueChange={field.onChange}><SelectTrigger id="template" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{templates.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select>}/></div>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">Hard constraints</legend>{constraints.fields.map((item, index) => <div key={item.id} className="flex flex-wrap gap-2"><select aria-label={`Constraint ${index + 1} type`} className="rounded border p-2 text-sm" {...form.register(`request.hardConstraints.${index}.kind`)}><option value="requirement">Required</option><option value="prohibition">Prohibited</option></select><Input aria-label={`Constraint ${index + 1}`} className="min-w-40 flex-1" maxLength={inputLimits.text} {...form.register(`request.hardConstraints.${index}.text`)}/><Button type="button" variant="ghost" aria-label={`Remove constraint ${index + 1}`} onClick={() => constraints.remove(index)}>Remove</Button></div>)}<Button type="button" variant="outline" size="sm" disabled={constraints.fields.length >= inputLimits.hardConstraints} onClick={() => constraints.append({ kind: "requirement", text: "" })}><Plus/>Add constraint</Button>{form.formState.errors.request?.hardConstraints && <p className="text-sm text-destructive">Complete every constraint.</p>}</fieldset>
      <div><Label htmlFor="unknowns">What is still unknown?</Label><Textarea id="unknowns" rows={2} maxLength={inputLimits.text} {...form.register("request.unknowns")}/></div>
      {concepts.length > 0 && <fieldset><legend className="text-sm font-medium">Concepts</legend>{concepts.map((concept) => <label key={concept.id} className="mr-4 inline-flex gap-2 py-2 text-sm"><input type="checkbox" value={concept.id} {...form.register("request.conceptIds")}/>{concept.label}</label>)}</fieldset>}
    </div></details>
    <div className="flex items-center justify-between gap-4"><p className="text-xs text-muted-foreground">Answers use published cases from your Knowledge Hub.</p><Button type="submit" disabled={disabled || form.formState.isSubmitting || !!session.state?.busy}><ArrowUp/>{form.formState.isSubmitting ? "Saving…" : "Send question"}</Button></div>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </form>;
}
