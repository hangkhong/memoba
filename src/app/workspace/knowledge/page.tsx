import { requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { KnowledgeTabs } from "@/components/knowledge-tabs";
import { listCases } from "@/modules/cases/repository";
import { listConcepts } from "@/modules/cases/queries";
import { caseRows } from "@/modules/cases/case-rows";
import { CaseLibrary } from "@/modules/cases/case-library";
import { KnowledgeActions } from "@/modules/cases/knowledge-actions";
import { listDocuments } from "@/modules/documents/repository";
import { documentRows } from "@/modules/documents/document-rows";
import { DocumentLibrary } from "@/modules/documents/document-library";
import { AddDocumentAction } from "@/modules/documents/document-actions";
export default async function KnowledgeHubPage({ searchParams }: { searchParams: Promise<{ record?: string; tab?: string }> }) {
  const context = await requireWorkspace(); const { record, tab } = await searchParams;
  const supabase = await createServerSupabase();
  const documents = tab === "documents";
  return <div className="workspace-page max-w-6xl"><div className="flex flex-wrap items-start justify-between gap-5"><div><h1 className="page-title">Knowledge Hub</h1><p className="page-description">{documents ? "Your company’s policies, procedures, and guidelines." : "Your team’s recorded approaches, outcomes, and lessons."}</p></div>{documents ? <AddDocumentAction/> : <KnowledgeActions key={record ?? "none"} concepts={await listConcepts(context)} defaultRecord={record === "1"}/>}</div>
    <KnowledgeTabs tab={documents ? "documents" : "cases"}>{documents ? <DocumentLibrary rows={documentRows(await listDocuments(supabase, context))}/> : await caseLibrary(supabase, context)}</KnowledgeTabs>
  </div>;
}
async function caseLibrary(supabase: Awaited<ReturnType<typeof createServerSupabase>>, context: Awaited<ReturnType<typeof requireWorkspace>>) {
  const [cases, concepts] = await Promise.all([listCases(supabase, context), listConcepts(context)]);
  return <CaseLibrary rows={caseRows(cases, concepts)}/>;
}
