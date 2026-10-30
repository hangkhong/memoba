import { requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { listCases } from "@/modules/cases/repository";
import { listConcepts } from "@/modules/cases/queries";
import { caseRows } from "@/modules/cases/case-rows";
import { CaseLibrary } from "@/modules/cases/case-library";
import { KnowledgeActions } from "@/modules/cases/knowledge-actions";
export default async function KnowledgeHubPage({ searchParams }: { searchParams: Promise<{ record?: string }> }) {
  const context = await requireWorkspace(); const { record } = await searchParams;
  const [cases, concepts] = await Promise.all([listCases(await createServerSupabase(), context), listConcepts(context)]);
  return <div className="workspace-page max-w-6xl"><div className="flex flex-wrap items-start justify-between gap-5"><div><h1 className="page-title">Knowledge Hub</h1><p className="page-description">Your team’s recorded approaches, outcomes, and lessons.</p></div><KnowledgeActions key={record ?? "none"} concepts={concepts} defaultRecord={record === "1"}/></div><CaseLibrary rows={caseRows(cases, concepts)}/></div>;
}
