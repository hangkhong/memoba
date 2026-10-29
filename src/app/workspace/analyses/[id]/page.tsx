import Link from "next/link";
import { z } from "zod";
import { notFound,redirect } from "next/navigation";
import { AccessError,requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { readStoredRun } from "@/modules/analysis/repository";
import { RunView } from "@/modules/analysis/run-view";
export default async function RunPage({params}:{params:Promise<{id:string}>}) {
 const context=await requireWorkspace().catch((error:unknown)=>{if(error instanceof AccessError && error.status===401)redirect("/login");throw error;});const id=z.uuid().safeParse((await params).id);if(!id.success)notFound();const run=await readStoredRun(await createServerSupabase(),context,id.data);if(!run)notFound();return <div className="workspace-page max-w-3xl"><Link href="/workspace">← Workspace</Link><h1 className="page-title my-6">Analysis run</h1><p>{run.request.version === 2 ? run.request.message : run.request.objective}</p><RunView initial={run}/></div>;
}
