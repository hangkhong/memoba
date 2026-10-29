import Link from "next/link";
import { z } from "zod";
import { notFound,redirect } from "next/navigation";
import { AccessError,requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { readStoredBrief } from "@/modules/briefs/repository";
import { EvidenceLayout } from "@/modules/briefs/evidence-view";
import { BriefView } from "@/modules/briefs/brief-view";
export default async function BriefPage({params}:{params:Promise<{id:string}>}) {
 const context=await requireWorkspace().catch((error:unknown)=>{if(error instanceof AccessError && error.status===401)redirect("/login");throw error;});const id=z.uuid().safeParse((await params).id);if(!id.success)notFound();const brief=await readStoredBrief(await createServerSupabase(),context,id.data);if(!brief)notFound();return <EvidenceLayout><div className="workspace-page max-w-[var(--transcript-width)]"><Link href="/workspace">← Workspace</Link><h1 className="page-title my-6">{"version" in brief.generated ? "Answer" : "Reuse Brief"}</h1><BriefView brief={brief}/></div></EvidenceLayout>;
}
