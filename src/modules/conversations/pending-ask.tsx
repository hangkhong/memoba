"use client";
import Link from "next/link";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { Composer } from "./composer";
import { ChatConversation, ChatConversationContent } from "./conversation";
import { useChatSession, type Ask } from "./chat-session";

export function PendingQuestion({ ask }: { ask: Ask }) {
  return <section aria-label="Your question" aria-busy={ask.status === "saving"}>
    <Message align="end"><MessageContent><Bubble align="end" variant="muted" className="max-w-xl"><BubbleContent className="rounded-2xl px-4 py-2.5 text-base leading-7"><p className="whitespace-pre-wrap break-words">{ask.message}</p></BubbleContent></Bubble></MessageContent></Message>
    <p role="status" className="mt-4 text-sm text-muted-foreground">{ask.status === "saving" ? "Saving your question…" : "Starting the analysis…"}</p>
  </section>;
}

// Shown while a first question is still being saved, before the server can read its conversation.
export function PendingConversation({ id }: { id: string }) {
  const { ask } = useChatSession();
  const pending = ask?.conversationId === id && ask.status !== "failed" ? ask : null;
  if (!pending) return <div className="workspace-page"><h1 className="page-title">Conversation unavailable</h1><p className="page-description"><Link className="underline" href="/workspace/chat">Start a new chat</Link></p></div>;
  return <div className="flex h-[calc(100svh-3rem)] min-h-0 min-w-0 flex-1 flex-col md:h-svh">
    <ChatConversation aria-label="Conversation messages"><ChatConversationContent><PendingQuestion ask={pending}/></ChatConversationContent></ChatConversation>
    <div className="mx-auto w-full max-w-[var(--transcript-width)] shrink-0 bg-background px-4 pt-2 pb-4 md:px-8"><Composer conversationId={id} concepts={[]} disabled/></div>
  </div>;
}
