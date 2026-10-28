import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { isSameOrigin, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { requestSchema } from "@/modules/analysis/schema";
import { turnInputSchema } from "@/modules/conversations/schema";
import { requestForTurn } from "@/modules/conversations/service";
import { saveTurn } from "@/modules/conversations/repository";
import { conversationErrorResponse } from "@/modules/conversations/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 400);
  try {
    await requireWorkspace(); const id = z.uuid().safeParse((await params).id);
    const input = turnInputSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !input.success) return privateJson({ error: "Review your question and request details." }, 400);
    const normalized = requestSchema.safeParse(requestForTurn(input.data));
    if (!normalized.success) return privateJson({ error: "Request context is too long. Shorten it in Request details before sending." }, 400);
    return privateJson({ turnId: await saveTurn(await createServerSupabase(), id.data, input.data, normalized.data) });
  } catch (error) { return conversationErrorResponse(error); }
}
