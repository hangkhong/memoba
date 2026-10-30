import { requireWorkspace } from "@/lib/auth/workspace";
import { listConcepts } from "@/modules/cases/queries";
import { NewChatStart } from "@/modules/conversations/new-chat-start";
export default async function NewChatPage() {
  const context = await requireWorkspace();
  return <div className="mx-auto flex min-h-[calc(100svh-3rem-10px)] w-full max-w-[var(--transcript-width)] flex-col justify-center px-4 py-12 md:px-8"><h1 className="page-title">What are you working on?</h1><p className="page-description mb-7">Ask a question using your team&apos;s recorded experience.</p><NewChatStart concepts={await listConcepts(context)}/></div>;
}
