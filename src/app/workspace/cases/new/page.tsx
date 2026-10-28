import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { CaseForm } from "@/modules/cases/case-form";
import { listConcepts } from "@/modules/cases/queries";
export default async function NewCasePage() {
  const context = await requireWorkspace().catch((error: unknown) => { if (error instanceof AccessError && error.status === 401) redirect("/login"); throw error; });
  return <main className="mx-auto max-w-3xl p-8"><Link href="/workspace">← Workspace</Link><h1 className="my-8 text-3xl font-semibold">Record a case</h1><CaseForm concepts={await listConcepts(context)}/></main>;
}
