"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import type { AnalysisEvent } from "@/modules/analysis/events";
import { readAnalysisStream, type AnalysisOutcome } from "./stream";

type SessionState = { conversationId: string; turnId: string; runId: string | null; outcome: AnalysisOutcome | null; events: AnalysisEvent[]; busy: boolean; message: string };
type Session = { state: SessionState | null; start: (conversationId: string, turnId: string, key: string) => Promise<void>; cancel: () => void };
const ChatContext = createContext<Session | null>(null);
const errorSchema = z.object({ error: z.string() });

export function ChatSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function start(conversationId: string, turnId: string, key: string) {
    if (controller.current) return;
    const abort = new AbortController(); controller.current = abort;
    setState({ conversationId, turnId, runId: null, outcome: null, events: [], busy: true, message: "" });
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
      if (controller.current === abort) {
        controller.current = null;
        setState((current) => current && { ...current, busy: false });
        router.refresh();
      }
    }
  }
  return <ChatContext.Provider value={{ state, start, cancel: () => controller.current?.abort() }}>{children}</ChatContext.Provider>;
}
export function useChatSession() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("ChatSession is required");
  return value;
}
