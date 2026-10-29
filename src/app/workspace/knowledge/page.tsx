import Link from "next/link";
import { requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { listCases } from "@/modules/cases/repository";
import { CaseLibrary } from "@/modules/cases/case-library";
export default async function KnowledgeHubPage() {
  const context = await requireWorkspace(); const cases = await listCases(await createServerSupabase(), context);
  return <div className="workspace-page"><div className="flex flex-wrap items-start justify-between gap-5"><div><h1 className="page-title">Knowledge Hub</h1><p className="page-description">Your team’s recorded approaches, outcomes, and lessons.</p></div><Link href="/workspace/knowledge/new" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Record a case</Link></div><CaseLibrary cases={cases.flatMap((item) => item.revision ? [{ id: item.id, title: item.revision.content.title, problem: item.revision.content.problem, template: item.revision.content.template, outcome: item.revision.content.outcome, lifecycle: item.lifecycle, indexState: item.revision.index_state, published: !!item.published_revision_id, pendingUpdate: !!item.published_revision_id && item.latest_revision_id !== item.published_revision_id }] : [])}/></div>;
}
