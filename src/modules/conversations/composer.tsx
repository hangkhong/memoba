"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, Square } from "lucide-react";
import { inputLimits } from "@/lib/contracts/limits";
import type { NormalizedRequest } from "@/modules/analysis/schema";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { useChatSession } from "./chat-session";
import { textTurnInputSchema } from "./schema";
const composerSchema = textTurnInputSchema.pick({ message: true });
type Values = z.infer<typeof composerSchema>;
const errorSchema = z.object({ error: z.string() });
export function Composer({ conversationId, parentTurnId = null, disabled = false, prefill }: { conversationId?: string; parentTurnId?: string | null; initial?: NormalizedRequest; concepts: { id: string; label: string }[]; disabled?: boolean; prefill?: { text: string; id: number } }) {
  const router = useRouter(); const session = useChatSession();
  const [error, setError] = useState("");
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const composing = useRef(false);
  const sending = useRef(false);
  const pending = useRef<{ conversationId: string; turnKey: string } | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(composerSchema), defaultValues: { message: "" } });
  const message = form.register("message");
  const busy = !!session.state?.busy;
  const canStop = busy && session.state?.conversationId === conversationId;
  const blocked = disabled || busy || form.formState.isSubmitting;
  useEffect(() => {
    if (blocked) return;
    const frame = requestAnimationFrame(() => textarea.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [blocked]);
  useEffect(() => {
    if (!prefill) return;
    form.setValue("message", prefill.text, { shouldValidate: true });
    textarea.current?.focus({ preventScroll: true });
  }, [prefill, form]);
  async function submit(values: Values) {
    if (sending.current || disabled || session.state?.busy) return;
    sending.current = true;
    setError("");
    pending.current ??= { conversationId: conversationId ?? crypto.randomUUID(), turnKey: crypto.randomUUID() };
    const attempt = pending.current;
    try {
      if (!conversationId) {
        const created = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: attempt.conversationId }) });
        if (!created.ok) { const parsed = errorSchema.safeParse(await created.json()); setError(parsed.success ? parsed.data.error : "Could not create conversation."); return; }
      }
      const response = await fetch(`/api/conversations/${attempt.conversationId}/turns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: attempt.turnKey, parentTurnId, message: values.message }) });
      const raw: unknown = await response.json();
      if (!response.ok) { const parsed = errorSchema.safeParse(raw); setError(parsed.success ? parsed.data.error : "Could not save your question."); return; }
      const { turnId } = z.object({ turnId: z.uuid() }).parse(raw);
      pending.current = null;
      form.reset({ message: "" });
      void session.start(attempt.conversationId, turnId, attempt.turnKey);
      router.push(`/workspace/chat/${attempt.conversationId}`); router.refresh();
    } catch { setError("Could not send your question. Your input is still here; try again."); }
    finally { sending.current = false; }
  }
  return <form onSubmit={(event) => { void form.handleSubmit(submit)(event); }} className="space-y-2">
    <Label htmlFor="question" className="sr-only">{parentTurnId ? "Follow-up question" : "What do you want to achieve?"}</Label>
    <InputGroup className="rounded-2xl bg-background shadow-xs has-[textarea:focus-visible]:border-ring"><InputGroupTextarea id="question" rows={1} className="max-h-40 min-h-14 resize-none px-4 pt-3.5 text-base" placeholder={busy && !canStop ? "Another conversation is still running…" : disabled && !busy ? "Finishing the previous answer…" : parentTurnId ? "Ask a follow-up…" : "Ask about a decision, a problem, or your next step…"} maxLength={inputLimits.text} aria-invalid={!!form.formState.errors.message} disabled={blocked} {...message} ref={(element) => { message.ref(element); textarea.current = element; }} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={(event) => {
      if (event.key !== "Enter" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      event.preventDefault();
      if (!blocked) event.currentTarget.form?.requestSubmit();
    }}/>
    <InputGroupAddon align="block-end" className="justify-end px-2.5 pb-2.5">{canStop ? <Button type="button" size="icon" variant="outline" className="rounded-full" aria-label="Stop analysis" onClick={session.cancel}><Square className="fill-current"/></Button> : <Button type="submit" size="icon" className="rounded-full" aria-label="Send question" disabled={blocked}><ArrowUp/></Button>}</InputGroupAddon></InputGroup>
    {form.formState.errors.message && <p role="alert" className="text-sm text-destructive">Enter your question.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </form>;
}
