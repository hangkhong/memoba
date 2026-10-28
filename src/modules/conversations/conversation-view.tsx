"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BriefView } from "@/modules/briefs/brief-view";
import { RunView } from "@/modules/analysis/run-view";
import { Composer } from "./composer";
import { useChatSession } from "./chat-session";
import type { ConversationDetail } from "./view-schema";
export function ConversationView({ detail, userId, concepts }: { detail: ConversationDetail; userId: string; concepts: { id: string; label: string }[] }) {
  const router = useRouter(); const session = useChatSession();
  const latest = detail.turns.at(-1); const owner = detail.conversation.author_id === userId;
  const active = session.state?.conversationId === detail.conversation.id ? session.state : null;
  const running = detail.turns.some((turn) => turn.runs.some((run) => run.status === "running"));
  useEffect(() => {
    if (!running || active?.busy) return;
    const timer = setInterval(() => router.refresh(), 2000); return () => clearInterval(timer);
  }, [running, active?.busy, router]);
  return <div className="mx-auto max-w-5xl px-5 py-8 md:px-10"><h1 className="mb-8 text-2xl font-semibold tracking-tight">{detail.conversation.title}</h1><div className="space-y-10" aria-label="Conversation messages">{detail.turns.map((turn) => {
    const run = turn.runs.at(-1);
    return <section key={turn.id} aria-label={`Turn ${turn.position}`}><div className="ml-auto max-w-2xl rounded-2xl bg-muted px-5 py-4"><p className="whitespace-pre-wrap leading-7">{turn.message}</p><details className="mt-3 text-sm text-muted-foreground"><summary className="cursor-pointer">Request snapshot</summary><p className="mt-2 whitespace-pre-wrap">{turn.request.context}</p>{turn.request.hardConstraints.map((constraint, index) => <p key={index}>{constraint.kind}: {constraint.text}</p>)}</details></div><div className="mt-5 space-y-4">
      {run?.brief ? <><h2 className="text-xl font-semibold">Reuse Brief</h2><BriefView brief={run.brief} evidencePrefix={`${turn.id}-${run.id}`}/></> : run ? <RunView key={`${run.id}:${run.status}`} initial={run}/> : <p className="text-sm text-muted-foreground">Question saved. Analysis has not started.</p>}
      {turn.runs.length > 1 && <details><summary className="cursor-pointer text-sm text-muted-foreground">Previous attempts</summary>{turn.runs.slice(0, -1).map((attempt) => <p key={attempt.id}><Link className="underline" href={`/workspace/analyses/${attempt.id}`}>{attempt.status.replaceAll("_", " ")}</Link></p>)}</details>}
      {active?.turnId === turn.id && (active.busy || active.message) && <div role="status" className="space-y-2 text-sm">{active.events.map((event, index) => <p key={index}>{event.stage}{event.tool ? ` · ${event.tool}` : ""} · {event.state}</p>)}{active.message && <p className="rounded-lg border p-4">{active.message}</p>}{active.busy && <Button variant="outline" onClick={session.cancel}>Stop analysis</Button>}</div>}
      {owner && turn.id === latest?.id && !running && !session.state?.busy && (!run || ["failed", "cancelled", "timed_out"].includes(run.status)) && <Button variant="outline" onClick={() => { void session.start(detail.conversation.id, turn.id, run ? crypto.randomUUID() : turn.id); }}>{run ? "Retry analysis" : "Run analysis"}</Button>}
    </div></section>;
  })}</div><div className="mt-12">{owner ? <Composer key={latest?.id ?? "empty"} conversationId={detail.conversation.id} parentTurnId={latest?.id} initial={latest?.request} concepts={concepts} disabled={running}/> : <p className="text-sm text-muted-foreground">You can read this conversation. Start a new chat to ask your own question.</p>}</div>{running && !active?.busy && <p className="mt-3 text-sm text-muted-foreground">Reading saved analysis state. Refresh does not resume generation.</p>}</div>;
}
