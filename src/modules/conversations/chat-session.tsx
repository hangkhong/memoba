"use client";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import type { AnalysisEvent } from "@/modules/analysis/events";
import { draftBuffer } from "./draft-buffer";
import { readAnalysisStream, type AnalysisOutcome } from "./stream";

type SessionState = { conversationId: string; turnId: string; runId: string | null; outcome: AnalysisOutcome | null; events: AnalysisEvent[]; draft: string; busy: boolean; message: string };
export type Ask = { conversationId: string; key: string; message: string; parentTurnId: string | null; isNew: boolean; status: "saving" | "saved" | "failed"; turnId: string | null; error: string };
type Session = { state: SessionState | null; ask: Ask | null; start: (conversationId: string, turnId: string, key: string) => Promise<void>; submitAsk: (ask: Pick<Ask, "conversationId" | "key" | "message" | "parentTurnId" | "isNew">) => void; dismissAsk: () => void; cancel: () => void };
const ChatContext = createContext<Session | null>(null);
const errorSchema = z.object({ error: z.string() });

const savedTurnSchema = z.object({ turnId: z.uuid() });
export function ChatSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ask, setAsk] = useState<Ask | null>(null);
  const dismissAsk = useCallback(() => setAsk(null), []);
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function start(conversationId: string, turnId: string, key: string) {
    if (controller.current) return;
    const abort = new AbortController(); controller.current = abort;
    setState({ conversationId, turnId, runId: null, outcome: null, events: [], draft: "", busy: true, message: "" });
    const draft = draftBuffer((apply) => setState((current) => current && { ...current, draft: apply(current.draft) }));
    try {
      const response = await fetch(`/api/conversations/${conversationId}/turns/${turnId}/analyses`, { method: "POST", headers: { "Idempotency-Key": key }, signal: abort.signal });
      if (!response.ok) {
        const parsed = errorSchema.safeParse(await response.json());
        setState((current) => current && { ...current, message: parsed.success ? parsed.data.error : "Analysis unavailable. Your question remains saved." });
        return;
      }
      if (!response.body) throw new Error("Missing stream");
      await readAnalysisStream(response.body, (event) => {
        if (controller.current !== abort) return;
        if (event.kind === "draft") { draft.push(event.chunk); return; }
        if (event.kind === "result") draft.flush();
        setState((current) => {
          if (!current) return current;
          switch (event.kind) {
            case "run": return { ...current, runId: event.runId };
            case "activity": return { ...current, events: [...current.events, event.event] };
            case "result": return { ...current, outcome: event.outcome };
          }
        });
      });
    } catch {
      const userRequested = abort.signal.aborted;
      abort.abort();
      if (controller.current === abort) setState((current) => current && { ...current, message: userRequested ? "Stop requested. Checking the saved analysis state. Your question is saved." : "Connection interrupted. Reload to read the saved run; generation does not automatically resume." });
    } finally {
      draft.flush();
      if (controller.current === abort) {
        controller.current = null;
        setState((current) => current && { ...current, busy: false });
      }
    }
  }
  // The question shows at once; the save runs in the background and the analysis starts once it is stored.
  function submitAsk(input: Pick<Ask, "conversationId" | "key" | "message" | "parentTurnId" | "isNew">) {
    const base = { ...input, turnId: null, error: "" };
    setAsk({ ...base, status: "saving" });
    const fail = (error: string) => {
      setAsk({ ...base, status: "failed", error });
      if (input.isNew) router.replace("/workspace/chat");
    };
    void (async () => {
      try {
        const response = await fetch(`/api/conversations/${input.conversationId}/turns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: input.key, parentTurnId: input.parentTurnId, message: input.message, newConversation: input.isNew }) });
        const raw: unknown = await response.json();
        if (!response.ok) { const parsed = errorSchema.safeParse(raw); return fail(parsed.success ? parsed.data.error : "Could not save your question."); }
        const { turnId } = savedTurnSchema.parse(raw);
        setAsk({ ...base, status: "saved", turnId });
        void start(input.conversationId, turnId, input.key);
        router.refresh();
      } catch { fail("Could not send your question. Your input is still here; try again."); }
    })();
  }
  return <ChatContext.Provider value={{ state, ask, start, submitAsk, dismissAsk, cancel: () => controller.current?.abort() }}>{children}</ChatContext.Provider>;
}
export function useChatSession() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("ChatSession is required");
  return value;
}
