import Link from "next/link";
import { z } from "zod";
import { notFound,redirect } from "next/navigation";
import { AccessError,requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { readRun } from "@/modules/analysis/repository";
import { RunView } from "@/modules/analysis/run-view";
export default async function RunPage({params}:{params:Promise<{id:string}>}) {
 const context=await requireWorkspace().catch((error:unknown)=>{if(error instanceof AccessError && error.status===401)redirect("/login");throw error;});const id=z.uuid().safeParse((await params).id);if(!id.success)notFound();const run=await readRun(await createServerSupabase(),context,id.data);if(!run)notFound();return <div className="mx-auto max-w-4xl p-8"><Link href="/workspace">← Workspace</Link><h1 className="my-8 text-3xl font-semibold">Analysis run</h1><p>{run.request.objective}</p><RunView initial={run}/></div>;
}
