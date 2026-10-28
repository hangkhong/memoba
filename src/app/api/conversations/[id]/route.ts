import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { readConversation } from "@/modules/conversations/repository";
import { conversationErrorResponse } from "@/modules/conversations/http";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireWorkspace(); const id = z.uuid().safeParse((await params).id);
    if (!id.success) return privateJson({ error: "Conversation unavailable." }, 404);
    const detail = await readConversation(await createServerSupabase(), context, id.data);
    return detail ? privateJson(detail) : privateJson({ error: "Conversation unavailable." }, 404);
  } catch (error) { return conversationErrorResponse(error); }
}
