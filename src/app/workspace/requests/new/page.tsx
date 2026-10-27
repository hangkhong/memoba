import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { RequestForm } from "./request-form";
export default async function NewRequestPage() {
  try { await requireWorkspace(); }
  catch (error) { if (error instanceof AccessError && error.status === 401) redirect("/login"); return <main className="p-10">Workspace unavailable.</main>; }
  return <main className="mx-auto max-w-2xl px-6 py-10"><Link href="/workspace" className="text-sm text-muted-foreground">← Workspace</Link><p className="mt-10 text-sm text-muted-foreground">New request</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Give the next decision some context.</h1><p className="mt-4 mb-10 leading-7 text-muted-foreground">Define the outcome and the conditions that matter before looking for previous experience.</p><RequestForm/></main>;
}
