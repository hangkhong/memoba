export function selectLiveAttempt<T extends { runId: string | null }>(runs: readonly { id: string }[], live: T | null): T | null {
  if (live?.runId && runs.some((run) => run.id === live.runId) && runs.at(-1)?.id !== live.runId) return null;
  return live;
}
