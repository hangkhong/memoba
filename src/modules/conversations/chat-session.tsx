"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { parseJsonEventStream, uiMessageChunkSchema } from "ai";
import { z } from "zod";
import { eventSchema, type AnalysisEvent } from "@/modules/analysis/events";

type SessionState = { conversationId: string; turnId: string; events: AnalysisEvent[]; busy: boolean; message: string };
type Session = { state: SessionState | null; start: (conversationId: string, turnId: string, key: string) => Promise<void>; cancel: () => void };
const ChatContext = createContext<Session | null>(null);
const errorSchema = z.object({ error: z.string() });

// The workspace shell owns the connection, so route changes cannot unmount it.
export function ChatSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function start(conversationId: string, turnId: string, key: string) {
    if (controller.current) return;
    const abort = new AbortController(); controller.current = abort;
    setState({ conversationId, turnId, events: [], busy: true, message: "" });
    try {
      const response = await fetch(`/api/conversations/${conversationId}/turns/${turnId}/analyses`, { method: "POST", headers: { "Idempotency-Key": key }, signal: abort.signal });
      if (!response.ok) {
        const parsed = errorSchema.safeParse(await response.json());
        setState((current) => current && { ...current, message: parsed.success ? parsed.data.error : "Analysis unavailable. Your question remains saved." });
        return;
      }
      if (!response.body) throw new Error("Missing stream");
      const reader = parseJsonEventStream({ stream: response.body, schema: uiMessageChunkSchema }).getReader();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        if (!value.success) continue;
        if (value.value.type === "data-activity") {
          const event = eventSchema.parse(value.value.data);
          setState((current) => current && { ...current, events: [...current.events, event] });
        }
        if (value.value.type === "error") throw new Error("Stream failed");
      }
    } catch {
      setState((current) => current && { ...current, message: abort.signal.aborted ? "Analysis stopped. Your question is saved." : "Connection interrupted. Reload to read the saved run; generation does not automatically resume." });
    } finally {
      controller.current = null;
      setState((current) => current && { ...current, busy: false });
      router.refresh();
    }
  }
  return <ChatContext.Provider value={{ state, start, cancel: () => controller.current?.abort() }}>{children}</ChatContext.Provider>;
}
export function useChatSession() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("ChatSession is required");
  return value;
}
