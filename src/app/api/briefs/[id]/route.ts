import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { readBrief, briefEditSchema } from "@/modules/briefs/repository";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try { const context=await requireWorkspace(); const id=z.uuid().safeParse((await params).id); if (!id.success) return privateJson({ error:"Brief unavailable." },404); const brief=await readBrief(await createServerSupabase(),context,id.data); return brief ? privateJson(brief) : privateJson({ error:"Brief unavailable." },404); } catch(error) { return accessResponse(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  if (!isSameOrigin(request)) return privateJson({ error:"Invalid origin." },400);
  try { const context=await requireWorkspace(); const id=z.uuid().safeParse((await params).id); const input=briefEditSchema.safeParse(await request.json().catch(()=>null)); if (!id.success || !input.success) return privateJson({ error:"Review the brief edit." },400); const client=await createServerSupabase(); if (!await readBrief(client,context,id.data)) return privateJson({ error:"Brief unavailable." },404); const result=await client.rpc("edit_brief",{brief:id.data,text_value:input.data.text,save_value:input.data.saved}); return result.error ? privateJson({error:"Save unavailable."},503) : privateJson({kind:"saved"}); } catch(error) { return accessResponse(error); }
}
