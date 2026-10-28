import { requireWorkspace } from "@/lib/auth/workspace";
import { listConcepts } from "@/modules/cases/queries";
import { Composer } from "@/modules/conversations/composer";
export default async function NewChatPage() {
  const context = await requireWorkspace();
  return <div className="mx-auto flex min-h-[75svh] max-w-3xl flex-col justify-center px-5 py-10"><p className="mb-3 text-sm text-muted-foreground">Your team&apos;s experience, ready to use</p><h1 className="text-4xl font-semibold tracking-tight">What are you working on?</h1><p className="mb-10 mt-4 max-w-xl leading-7 text-muted-foreground">Bring a question. Find approaches, lessons, and conditions from the cases your team has recorded.</p><Composer concepts={await listConcepts(context)}/></div>;
}
