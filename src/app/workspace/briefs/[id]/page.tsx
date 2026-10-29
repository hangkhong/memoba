import Link from "next/link";
import { z } from "zod";
import { notFound,redirect } from "next/navigation";
import { AccessError,requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { readStoredBrief } from "@/modules/briefs/repository";
import { BriefView } from "@/modules/briefs/brief-view";
export default async function BriefPage({params}:{params:Promise<{id:string}>}) {
 const context=await requireWorkspace().catch((error:unknown)=>{if(error instanceof AccessError && error.status===401)redirect("/login");throw error;});const id=z.uuid().safeParse((await params).id);if(!id.success)notFound();const brief=await readStoredBrief(await createServerSupabase(),context,id.data);if(!brief)notFound();return <div className="mx-auto max-w-6xl p-8"><Link href="/workspace">← Workspace</Link><h1 className="my-8 text-3xl font-semibold">{"version" in brief.generated ? "Answer" : "Reuse Brief"}</h1><BriefView brief={brief}/></div>;
}
