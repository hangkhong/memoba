import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { prepareAnalysis } from "./runtime";
type AdmittedRun = Extract<Awaited<ReturnType<typeof prepareAnalysis>>, { kind: "admitted" }>;
export function analysisStream(run: AdmittedRun, signal: AbortSignal) {
  const stream = createUIMessageStream({ execute: async ({ writer }) => {
    writer.write({ type: "start", messageId: run.runId });
    writer.write({ type: "data-run", data: { runId: run.runId } });
    const result = await run.execute((event) => writer.write({ type: "data-activity", data: event }), signal, (chunk) => writer.write({ type: "data-draft", data: chunk, transient: true }));
    writer.write({ type: "data-result", data: result }); writer.write({ type: "finish" });
  }, onError: () => "Analysis unavailable. Refresh the run to see its saved state." });
  return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "private, no-store", "X-Run-Id": run.runId } });
}
