import { notFound } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { listConcepts } from "@/modules/cases/queries";
import { readConversation } from "@/modules/conversations/repository";
import { ConversationView } from "@/modules/conversations/conversation-view";
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireWorkspace(); const id = z.uuid().safeParse((await params).id); if (!id.success) notFound();
  const detail = await readConversation(await createServerSupabase(), context, id.data); if (!detail) notFound();
  return <ConversationView detail={detail} userId={context.userId} concepts={await listConcepts(context)}/>;
}
