import { analysisStream } from "@/modules/analysis/stream";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { storedRunInputSchema } from "@/modules/analysis/schema";
import { readAIConfig } from "@/lib/config/env";
import { prepareAnalysis } from "@/modules/analysis/runtime";
import { runBoundedSetup } from "@/modules/analysis/budget";
import { AdmissionContextOverflow } from "@/modules/analysis/repository";
export const maxDuration = 300;
export async function POST(request: Request) {
  const handlerStartedAt = Date.now();
  return runBoundedSetup(request.signal, handlerStartedAt, process.env.VERCEL === "1", async (setupSignal) => {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 400);
  try {
    const context = await requireWorkspace();
    setupSignal.throwIfAborted();
    const parsed = storedRunInputSchema.safeParse(await request.json().catch(() => null));
    setupSignal.throwIfAborted();
    const key = z.uuid().safeParse(request.headers.get("Idempotency-Key"));
    if (!parsed.success || !key.success) return privateJson({ error: "Review the request and provide an idempotency key." }, 400);
    if (readAIConfig(process.env).kind !== "configured") return privateJson({ code: "AI_UNAVAILABLE", error: "AI analysis is unavailable. Your request has not been saved or sent to a model." }, 503);
    const run = await prepareAnalysis(context, parsed.data, key.data, undefined, handlerStartedAt, setupSignal);
    if (run.kind === "conflict") return privateJson({ error: "Request key reused. Submit a new attempt." }, 409);
    if (run.kind === "duplicate") return privateJson({ error: "This request already has a run.", runId: run.runId }, 409);
    if (run.kind === "quota") return privateJson({ error: "Two analyses are already running. Try again after one finishes." }, 429);
    return analysisStream(run, request.signal);
  } catch (error) { return error instanceof AdmissionContextOverflow ? privateJson({ error: "The saved request is too long to analyze without dropping context. Start a shorter question." }, 400) : accessResponse(error); }
  }).catch(() => privateJson({ error: "Analysis setup timed out or was cancelled." }, 503));
}
