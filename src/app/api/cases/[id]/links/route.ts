import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse,isSameOrigin,privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { relationTypeSchema } from "@/modules/cases/schema";
import { inputLimits } from "@/lib/contracts/limits";
const reason=z.string().trim().min(1).max(inputLimits.text);
const linkSchema=z.object({target:z.uuid(),relation:relationTypeSchema,reason,archiveTarget:z.boolean()}).strict().refine((input)=>!input.archiveTarget||input.relation==="supersedes","Archive requires supersedes.");
// A link is identified by its ends and relation. The case in the path must be one of the ends.
const linkRef={source:z.uuid(),target:z.uuid(),relation:relationTypeSchema};
const updateSchema=z.object({...linkRef,newRelation:relationTypeSchema,reason}).strict();
const removeSchema=z.object(linkRef).strict();
const touches=(id:string,link:{source:string;target:string})=>link.source!==link.target&&(link.source===id||link.target===id);
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 if(!isSameOrigin(request))return privateJson({error:"Invalid origin."},400);
 try{await requireWorkspace();const source=z.uuid().safeParse((await params).id);const input=linkSchema.safeParse(await request.json().catch(()=>null));if(!source.success||!input.success||source.data===input.data.target)return privateJson({error:"Review the link fields."},400);const result=await(await createServerSupabase()).rpc("link_cases",{source:source.data,target:input.data.target,relation:input.data.relation,reason:input.data.reason,archive_target:input.data.archiveTarget});return result.error?privateJson({error:"Link unavailable. Check access and supersedes cycles."},400):privateJson({kind:"linked"});}catch(error){return accessResponse(error);}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
 if(!isSameOrigin(request))return privateJson({error:"Invalid origin."},400);
 try{await requireWorkspace();const id=z.uuid().safeParse((await params).id);const input=updateSchema.safeParse(await request.json().catch(()=>null));if(!id.success||!input.success||!touches(id.data,input.data))return privateJson({error:"Review the link fields."},400);const result=await(await createServerSupabase()).rpc("update_case_link",{source:input.data.source,target:input.data.target,relation:input.data.relation,new_relation:input.data.newRelation,new_reason:input.data.reason});if(!result.error)return privateJson({kind:"updated"});return result.error.code==="23505"?privateJson({error:"These cases already have that relation."},409):privateJson({error:"Link unavailable. Check access and supersedes cycles."},400);}catch(error){return accessResponse(error);}
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}) {
 if(!isSameOrigin(request))return privateJson({error:"Invalid origin."},400);
 try{await requireWorkspace();const id=z.uuid().safeParse((await params).id);const input=removeSchema.safeParse(await request.json().catch(()=>null));if(!id.success||!input.success||!touches(id.data,input.data))return privateJson({error:"Review the link fields."},400);const result=await(await createServerSupabase()).rpc("unlink_cases",{source:input.data.source,target:input.data.target,relation:input.data.relation});return result.error?privateJson({error:"Link unavailable. It may already be removed."},400):privateJson({kind:"unlinked"});}catch(error){return accessResponse(error);}
}
