import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { isSameOrigin, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { textRunInputSchema } from "@/modules/analysis/schema";
import { textTurnInputSchema } from "@/modules/conversations/schema";
import { historyForConversation } from "@/modules/conversations/service";
import { readConversation, saveTurn } from "@/modules/conversations/repository";
import { conversationErrorResponse } from "@/modules/conversations/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 400);
  try {
    const context = await requireWorkspace(); const id = z.uuid().safeParse((await params).id);
    const input = textTurnInputSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !input.success) return privateJson({ error: "Review your question." }, 400);
    const client = await createServerSupabase();
    const detail = await readConversation(client, context, id.data);
    if (!detail || detail.conversation.author_id !== context.userId) return privateJson({ error: "Conversation unavailable." }, 404);
    const prior = await client.from("conversation_turns").select("id,message,parent_turn_id").eq("workspace_id", context.workspaceId).eq("conversation_id", id.data).eq("request_key", input.data.key).maybeSingle();
    if (prior.error) throw new Error("CONVERSATION_UNAVAILABLE");
    if (prior.data) {
      if (prior.data.message !== input.data.message || prior.data.parent_turn_id !== input.data.parentTurnId) return privateJson({ error: "Request key reused." }, 409);
      return privateJson({ turnId: prior.data.id });
    }
    const snapshot = textRunInputSchema.safeParse({ version: 2, message: input.data.message, history: historyForConversation(detail.turns) });
    if (!snapshot.success) return privateJson({ error: "Conversation history is too long to include safely. Start a new chat and include the constraints that still matter." }, 400);
    return privateJson({ turnId: await saveTurn(client, id.data, input.data, snapshot.data) });
  } catch (error) { return conversationErrorResponse(error); }
}
