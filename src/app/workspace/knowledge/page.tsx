import Link from "next/link";
import { requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { listCases } from "@/modules/cases/repository";
import { CaseLibrary } from "@/modules/cases/case-library";
export default async function KnowledgeHubPage() {
  const context = await requireWorkspace(); const cases = await listCases(await createServerSupabase(), context);
  return <div className="mx-auto max-w-5xl px-5 py-10 md:px-10"><div className="flex flex-wrap items-start justify-between gap-5"><div><h1 className="text-3xl font-semibold tracking-tight">Knowledge Hub</h1><p className="mt-3 max-w-xl leading-7 text-muted-foreground">Record the experience behind your team&apos;s decisions. Published cases become evidence for your next conversation.</p></div><Link href="/workspace/knowledge/new" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Record a case</Link></div><CaseLibrary cases={cases.flatMap((item) => item.revision ? [{ id: item.id, title: item.revision.content.title, problem: item.revision.content.problem, template: item.revision.content.template, outcome: item.revision.content.outcome, lifecycle: item.lifecycle, indexState: item.revision.index_state, pendingUpdate: !!item.published_revision_id && item.latest_revision_id !== item.published_revision_id }] : [])}/></div>;
}
