import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { requestSchema } from "@/modules/analysis/schema";
import { readAIConfig } from "@/lib/config/env";
import { prepareAnalysis } from "@/modules/analysis/runtime";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 400);
  try {
    const context = await requireWorkspace();
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    const key = z.uuid().safeParse(request.headers.get("Idempotency-Key"));
    if (!parsed.success || !key.success) return privateJson({ error: "Review the request and provide an idempotency key." }, 400);
    if (readAIConfig(process.env).kind !== "configured") return privateJson({ code: "AI_UNAVAILABLE", error: "AI analysis is unavailable. Your request has not been saved or sent to a model." }, 503);
    const run = await prepareAnalysis(context, parsed.data, key.data);
    if (run.kind === "duplicate") return privateJson({ error: "This request already has a run.", runId: run.runId }, 409);
    if (run.kind === "quota") return privateJson({ error: "Two analyses are already running. Try again after one finishes." }, 429);
    const stream = createUIMessageStream({ execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: run.runId });
      writer.write({ type: "data-run", data: { runId: run.runId } });
      const result = await run.execute((event) => writer.write({ type: "data-activity", data: event }), request.signal);
      writer.write({ type: "data-result", data: result }); writer.write({ type: "finish" });
    }, onError: () => "Analysis unavailable. Refresh the run to see its saved state." });
    return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "private, no-store", "X-Run-Id": run.runId } });
  } catch (error) { return accessResponse(error); }
}
