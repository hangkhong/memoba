import { parseJsonEventStream, uiMessageChunkSchema } from "ai";
import { z } from "zod";
import { eventSchema, terminalSchema, type AnalysisEvent } from "@/modules/analysis/events";

const runIdentitySchema = z.object({ runId: z.uuid() });
const outcomeSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("complete"), briefId: z.uuid(), code: z.null() }),
  z.object({ status: terminalSchema.exclude(["complete"]), briefId: z.null(), code: z.string().nullable() }),
]);
export type AnalysisOutcome = z.infer<typeof outcomeSchema>;
type StreamEvent =
  | { kind: "run"; runId: string }
  | { kind: "activity"; event: AnalysisEvent }
  | { kind: "result"; outcome: AnalysisOutcome };

export async function readAnalysisStream(body: ReadableStream<Uint8Array>, emit: (event: StreamEvent) => void) {
  const reader = parseJsonEventStream({ stream: body, schema: uiMessageChunkSchema }).getReader();
  let runId: string | undefined;
  let outcome: AnalysisOutcome | undefined;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value.success) throw new Error("Invalid analysis stream");
      const chunk = value.value;
      if (chunk.type === "error") throw new Error("Analysis stream failed");
      if (chunk.type === "data-run") {
        const identity = runIdentitySchema.parse(chunk.data);
        if (runId && runId !== identity.runId) throw new Error("Analysis run changed");
        runId = identity.runId;
        emit({ kind: "run", runId });
      }
      if (chunk.type === "data-activity") {
        if (!runId || outcome) throw new Error("Unexpected analysis activity");
        emit({ kind: "activity", event: eventSchema.parse(chunk.data) });
      }
      if (chunk.type === "data-result") {
        if (!runId || outcome) throw new Error("Unexpected analysis result");
        outcome = outcomeSchema.parse(chunk.data);
        emit({ kind: "result", outcome });
      }
    }
    if (!runId || !outcome) throw new Error("Analysis ended without a saved result");
    return { runId, outcome };
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
