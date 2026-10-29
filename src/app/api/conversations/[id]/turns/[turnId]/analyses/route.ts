import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { isSameOrigin, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { readAIConfig } from "@/lib/config/env";
import { prepareAnalysis } from "@/modules/analysis/runtime";
import { analysisStream } from "@/modules/analysis/stream";
import { storedTurnSchema } from "@/modules/conversations/schema";
import { conversationErrorResponse } from "@/modules/conversations/http";
import { runBoundedSetup } from "@/modules/analysis/budget";
import { AdmissionContextOverflow } from "@/modules/analysis/repository";
export const maxDuration = 300;
export async function POST(request: Request, { params }: { params: Promise<{ id: string; turnId: string }> }) {
  const handlerStartedAt = Date.now();
  return runBoundedSetup(request.signal, handlerStartedAt, process.env.VERCEL === "1", async (setupSignal) => {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 400);
  try {
    const context = await requireWorkspace();
    setupSignal.throwIfAborted();
    const ids = z.object({ id: z.uuid(), turnId: z.uuid() }).safeParse(await params);
    setupSignal.throwIfAborted();
    const key = z.uuid().safeParse(request.headers.get("Idempotency-Key"));
    if (!ids.success || !key.success) return privateJson({ error: "Invalid analysis request." }, 400);
    const client = await createServerSupabase();
    setupSignal.throwIfAborted();
    const result = await client.from("conversation_turns").select("*,conversations!inner(author_id)").eq("id", ids.data.turnId).eq("conversation_id", ids.data.id).eq("workspace_id", context.workspaceId).abortSignal(setupSignal).maybeSingle();
    setupSignal.throwIfAborted();
    const row = storedTurnSchema.extend({ conversations: z.object({ author_id: z.uuid() }) }).nullable().parse(result.data);
    if (result.error || !row || row.conversations.author_id !== context.userId) return privateJson({ error: "Conversation unavailable." }, 404);
    if (readAIConfig(process.env).kind !== "configured") return privateJson({ code: "AI_UNAVAILABLE", error: "AI analysis is unavailable. Your question is saved; no model was called." }, 503);
    const run = await prepareAnalysis(context, row.request, key.data, row.id, handlerStartedAt, setupSignal);
    if (run.kind === "conflict") return privateJson({ error: "Conversation changed or this turn is already answered. Refresh before retrying." }, 409);
    if (run.kind === "duplicate") return privateJson({ error: "This attempt already exists.", runId: run.runId }, 409);
    if (run.kind === "quota") return privateJson({ error: "An analysis is already running. Your question remains saved." }, 429);
    return analysisStream(run, request.signal);
  } catch (error) { return error instanceof AdmissionContextOverflow ? privateJson({ error: "The saved request is too long to analyze without dropping context. Start a shorter question." }, 400) : conversationErrorResponse(error); }
  }).catch(() => privateJson({ error: "Analysis setup timed out or was cancelled. Your question remains saved." }, 503));
}
