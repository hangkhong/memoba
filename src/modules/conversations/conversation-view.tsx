"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BriefView } from "@/modules/briefs/brief-view";
import { coverageLine } from "@/modules/briefs/coverage-presentation";
import { AnalysisActivity } from "@/modules/analysis/activity";
import { Message, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { MessageScrollerItem } from "@/components/ui/message-scroller";
import { EvidenceLayout } from "@/modules/briefs/evidence-view";
import { PendingQuestion } from "./pending-ask";
import { Composer } from "./composer";
import { ChatConversation, ChatConversationContent } from "./conversation";
import { useChatSession } from "./chat-session";
import { selectLiveAttempt } from "./presentation";
import { fetchConversationDetail, hasRunningRun, isAwaitingSaved, watchSavedResult } from "./saved-result";
import type { ConversationDetail } from "./view-schema";

const statusNotes = { complete: "Loading the saved answer…", failed: "The analysis didn’t finish.", cancelled: "Analysis stopped.", timed_out: "Analysis reached its time limit." } as const;
export function ConversationView({ detail: serverDetail, userId, concepts }: { detail: ConversationDetail; userId: string; concepts: { id: string; label: string }[] }) {
  const [served, setServed] = useState(serverDetail);
  const [detail, setDetail] = useState(serverDetail);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (served !== serverDetail) { setServed(serverDetail); setDetail(serverDetail); }
  const session = useChatSession();
  const latest = detail.turns.at(-1);
  const owner = detail.conversation.author_id === userId;
  const active = session.state?.conversationId === detail.conversation.id ? session.state : null;
  const running = hasRunningRun(detail);
  const awaitingSaved = !active?.busy && isAwaitingSaved(detail, active?.runId);
  const waiting = running || awaitingSaved;
  const ask = session.ask?.conversationId === detail.conversation.id ? session.ask : null;
  const pendingAsk = ask && ask.status !== "failed" && !detail.turns.some((turn) => turn.id === ask.turnId) ? ask : null;
  const savedAskId = ask?.turnId && detail.turns.some((turn) => turn.id === ask.turnId) ? ask.turnId : null;
  const dismissAsk = session.dismissAsk;
  useEffect(() => { if (savedAskId) dismissAsk(); }, [savedAskId, dismissAsk]);
  const watchedRunId = active?.runId;
  const conversationId = detail.conversation.id;

  useEffect(() => {
    if (!waiting || active?.busy) return;
    const abort = new AbortController();
    void watchSavedResult({
      load: (signal) => fetchConversationDetail(conversationId, signal),
      settled: (next) => !hasRunningRun(next) && !isAwaitingSaved(next, watchedRunId),
      onDetail: setDetail,
      signal: abort.signal,
    }).then((result) => { if (result === "failed") setLoadFailed(true); });
    return () => abort.abort();
  }, [waiting, active?.busy, conversationId, watchedRunId, attempt]);

  return <EvidenceLayout key={detail.conversation.id}><div className="flex h-[calc(100svh-3rem)] min-h-0 min-w-0 flex-1 flex-col md:h-[calc(100svh-3rem-10px)]">
    <h1 className="sr-only">{detail.conversation.title}</h1>
    <ChatConversation key={detail.conversation.id} aria-label="Conversation messages">
      <ChatConversationContent>{detail.turns.map((turn) => {
        const run = turn.runs.at(-1);
        const live = selectLiveAttempt(turn.runs, active?.turnId === turn.id ? active : null);
        const sameRun = !!live?.runId && live.runId === run?.id;
        const pendingRun = !!live?.runId && !sameRun;
        const savedTerminal = sameRun && run?.status !== "running";
        const liveWorking = !!live?.busy && !savedTerminal;
        const shownBrief = run?.brief && !liveWorking && !pendingRun ? run.brief : null;
        const events = liveWorking || pendingRun ? live?.events ?? [] : run?.events ?? live?.events ?? [];
        const status = liveWorking ? "running" : pendingRun ? live?.outcome?.status : run?.status;
        return <MessageScrollerItem key={turn.id} messageId={turn.id} scrollAnchor><section aria-label={`Turn ${turn.position}`}>
          <Message align="end"><MessageContent><Bubble align="end" variant="muted" className="max-w-xl"><BubbleContent className="rounded-2xl px-4 py-2.5 text-base leading-7">
            <p className="whitespace-pre-wrap break-words">{turn.message}</p>
            {turn.request.version === 1 && <details className="mt-3 text-sm text-muted-foreground"><summary className="cursor-pointer">Request snapshot</summary><p className="mt-2 whitespace-pre-wrap">{turn.request.context}</p>{turn.request.hardConstraints.map((constraint, index) => <p key={index}>{constraint.kind}: {constraint.text}</p>)}</details>}
          </BubbleContent></Bubble></MessageContent></Message>
          <Message className="mt-6"><MessageContent className="gap-5">
            <AnalysisActivity key={run?.id ?? live?.runId ?? "pending"} events={events} status={status} coverage={shownBrief && "version" in shownBrief.generated ? coverageLine(shownBrief.generated.coverage) : null}/>
            {run?.brief && !liveWorking && !pendingRun ? <><BriefView showCoverage={!events.length} brief={run.brief} evidencePrefix={`${turn.id}-${run.id}`}/></> : <>
              {status === "running" || status === "gap_report" ? null : <p className="text-sm text-muted-foreground">{status ? statusNotes[status] : "Question saved. Analysis has not started."}</p>}
              {status === "gap_report" && <section className="rounded-xl border p-5"><h2 className="font-semibold">No precedent found</h2><p className="mt-3">The search completed successfully without usable evidence. Add cases covering the method, applicability conditions, and failures or exceptions for this request.</p></section>}
              {!liveWorking && !pendingRun && run?.error_code && <p className="text-sm text-muted-foreground">Check the knowledge and model services, then retry.</p>}
              
            </>}
            {turn.runs.length > 1 && <details><summary className="cursor-pointer text-sm text-muted-foreground">Previous attempts</summary>{turn.runs.slice(0, -1).map((attempt) => <p key={attempt.id}><Link className="underline" href={`/workspace/analyses/${attempt.id}`}>{attempt.status.replaceAll("_", " ")}</Link></p>)}</details>}
            {loadFailed && waiting && turn.id === latest?.id && <p role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm">Could not load the saved answer.<Button variant="outline" size="sm" onClick={() => { setLoadFailed(false); setAttempt((count) => count + 1); }}>Try again</Button></p>}
            {live?.message && !savedTerminal && <p role="status" className="rounded-lg border p-4 text-sm">{live.message}</p>}
            {owner && !pendingAsk && turn.id === latest?.id && !running && !awaitingSaved && !session.state?.busy && (!run || ["failed", "cancelled", "timed_out"].includes(run.status)) && <Button variant="outline" onClick={() => { void session.start(detail.conversation.id, turn.id, run ? crypto.randomUUID() : turn.id); }}>{run ? "Retry analysis" : "Run analysis"}</Button>}
          </MessageContent></Message>
        </section></MessageScrollerItem>;
      })}{pendingAsk && <MessageScrollerItem key="pending-ask" messageId="pending-ask" scrollAnchor><PendingQuestion ask={pendingAsk}/></MessageScrollerItem>}</ChatConversationContent>
    </ChatConversation>
    <div className="mx-auto w-full max-w-[var(--transcript-width)] shrink-0 bg-background px-4 pt-2 pb-4 md:px-8">
      {owner ? <Composer key={latest?.id ?? "empty"} conversationId={detail.conversation.id} parentTurnId={latest?.id} concepts={concepts} disabled={running || awaitingSaved || !!pendingAsk}/> : <p className="text-sm text-muted-foreground">You can read this conversation. Start a new chat to ask your own question.</p>}
    </div>
  </div></EvidenceLayout>;
}
