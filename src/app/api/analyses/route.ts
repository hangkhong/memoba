import { analysisStream } from "@/modules/analysis/stream";
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
    if (run.kind === "conflict") return privateJson({ error: "Request key reused. Submit a new attempt." }, 409);
    if (run.kind === "duplicate") return privateJson({ error: "This request already has a run.", runId: run.runId }, 409);
    if (run.kind === "quota") return privateJson({ error: "Two analyses are already running. Try again after one finishes." }, 429);
    return analysisStream(run, request.signal);
  } catch (error) { return accessResponse(error); }
}
