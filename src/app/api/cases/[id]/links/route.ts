import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse,isSameOrigin,privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { relationTypeSchema } from "@/modules/cases/schema";
import { inputLimits } from "@/lib/contracts/limits";
const linkSchema=z.object({target:z.uuid(),relation:relationTypeSchema,reason:z.string().trim().min(1).max(inputLimits.text),archiveTarget:z.boolean()}).strict().refine((input)=>!input.archiveTarget||input.relation==="supersedes","Archive requires supersedes.");
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 if(!isSameOrigin(request))return privateJson({error:"Invalid origin."},400);
 try{await requireWorkspace();const source=z.uuid().safeParse((await params).id);const input=linkSchema.safeParse(await request.json().catch(()=>null));if(!source.success||!input.success||source.data===input.data.target)return privateJson({error:"Review the link fields."},400);const result=await(await createServerSupabase()).rpc("link_cases",{source:source.data,target:input.data.target,relation:input.data.relation,reason:input.data.reason,archive_target:input.data.archiveTarget});return result.error?privateJson({error:"Link unavailable. Check access and supersedes cycles."},400):privateJson({kind:"linked"});}catch(error){return accessResponse(error);}
}
