import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { caseDetail } from "@/modules/cases/repository";
import { CaseForm } from "@/modules/cases/case-form";
import { listConcepts } from "@/modules/cases/queries";
export default async function EditCase({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireWorkspace(); const id = z.uuid().safeParse((await params).id); if (!id.success) notFound();
  const detail = await caseDetail(await createServerSupabase(), context, id.data); if (!detail || detail.lifecycle === "archived") notFound();
  const latest = detail.revisions.find((revision) => revision.id === detail.latest_revision_id); if (!latest) notFound();
  return <main className="mx-auto max-w-3xl p-8"><Link href={`/workspace/cases/${id.data}`}>← Case</Link><h1 className="my-8 text-3xl font-semibold">Save a new revision</h1><CaseForm initial={latest.content} caseId={id.data} concepts={await listConcepts(context)}/></main>;
}
