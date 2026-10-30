import type { DraftChunk } from "@/modules/analysis/draft";

// Batches token-sized chunks so the answer re-renders a few times a second, not once per token.
export function draftBuffer(commit: (apply: (current: string) => string) => void, delayMs = 60) {
  let reset = false;
  let text = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!reset && !text) return;
    const [dropCurrent, appended] = [reset, text];
    reset = false; text = "";
    commit((current) => (dropCurrent ? "" : current) + appended);
  }
  return {
    push(chunk: DraftChunk) {
      if (chunk.kind === "reset") { reset = true; text = ""; } else text += chunk.text;
      timer ??= setTimeout(flush, delayMs);
    },
    flush,
  };
}
