import { conversationDetailSchema, type ConversationDetail } from "./view-schema";

export const savedResultPolling = { delayMs: 2000, maxFailures: 3 } as const;

export async function fetchConversationDetail(conversationId: string, signal: AbortSignal): Promise<ConversationDetail> {
  const response = await fetch(`/api/conversations/${conversationId}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Conversation read failed with ${response.status}`);
  return conversationDetailSchema.parse(await response.json());
}

export function hasRunningRun(detail: ConversationDetail): boolean {
  return detail.turns.some((turn) => turn.runs.some((run) => run.status === "running"));
}

export function isAwaitingSaved(detail: ConversationDetail, runId: string | null | undefined): boolean {
  return !!runId && !detail.turns.some((turn) => turn.runs.some((run) => run.id === runId && run.status !== "running"));
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); }
    signal.addEventListener("abort", done);
  });
}

export type WatchResult = "settled" | "failed" | "aborted";

// Each read starts only after the previous one finished, so a slow response can never be overtaken.
export async function watchSavedResult({ load, settled, onDetail, signal, delayMs = savedResultPolling.delayMs, maxFailures = savedResultPolling.maxFailures }: {
  load: (signal: AbortSignal) => Promise<ConversationDetail>;
  settled: (detail: ConversationDetail) => boolean;
  onDetail: (detail: ConversationDetail) => void;
  signal: AbortSignal;
  delayMs?: number;
  maxFailures?: number;
}): Promise<WatchResult> {
  let failures = 0;
  while (!signal.aborted) {
    try {
      const detail = await load(signal);
      if (signal.aborted) break;
      failures = 0;
      onDetail(detail);
      if (settled(detail)) return "settled";
    } catch {
      if (signal.aborted) break;
      if (++failures >= maxFailures) return "failed";
    }
    await sleep(delayMs, signal);
  }
  return "aborted";
}
