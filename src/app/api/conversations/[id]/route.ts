import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { isSameOrigin, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { deleteConversation, readConversation } from "@/modules/conversations/repository";
import { conversationErrorResponse } from "@/modules/conversations/http";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireWorkspace(); const id = z.uuid().safeParse((await params).id);
    if (!id.success) return privateJson({ error: "Conversation unavailable." }, 404);
    const detail = await readConversation(await createServerSupabase(), context, id.data);
    return detail ? privateJson(detail) : privateJson({ error: "Conversation unavailable." }, 404);
  } catch (error) { return conversationErrorResponse(error); }
}
// Permanent. The database lets only the author delete, and not while a response is running.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 400);
  try {
    await requireWorkspace(); const id = z.uuid().safeParse((await params).id);
    if (!id.success) return privateJson({ error: "Conversation unavailable." }, 404);
    await deleteConversation(await createServerSupabase(), id.data);
    return privateJson({ deleted: true });
  } catch (error) { return conversationErrorResponse(error); }
}
