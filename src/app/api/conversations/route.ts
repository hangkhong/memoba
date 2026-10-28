import { requireWorkspace } from "@/lib/auth/workspace";
import { isSameOrigin, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { createConversationSchema } from "@/modules/conversations/schema";
import { createConversation, listConversations } from "@/modules/conversations/repository";
import { conversationErrorResponse } from "@/modules/conversations/http";
export async function GET() {
  try {
    const context = await requireWorkspace();
    return privateJson(await listConversations(await createServerSupabase(), context));
  } catch (error) { return conversationErrorResponse(error); }
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 400);
  try {
    const context = await requireWorkspace();
    const input = createConversationSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return privateJson({ error: "Invalid conversation." }, 400);
    return privateJson({ id: await createConversation(await createServerSupabase(), context, input.data.id) });
  } catch (error) { return conversationErrorResponse(error); }
}
