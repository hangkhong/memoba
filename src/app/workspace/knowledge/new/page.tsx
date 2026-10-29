import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { CaseForm } from "@/modules/cases/case-form";
import { listConcepts } from "@/modules/cases/queries";
export default async function NewCasePage() {
  const context = await requireWorkspace().catch((error: unknown) => { if (error instanceof AccessError && error.status === 401) redirect("/login"); throw error; });
  return <div className="workspace-page max-w-3xl"><Link href="/workspace/knowledge">← Knowledge Hub</Link><h1 className="page-title my-6">Record a case</h1><CaseForm concepts={await listConcepts(context)}/></div>;
}
