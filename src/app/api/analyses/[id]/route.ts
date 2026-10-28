import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { readRun } from "@/modules/analysis/repository";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await requireWorkspace(); const id = z.uuid().safeParse((await params).id); if (!id.success) return privateJson({ error: "Run unavailable." },404); const run = await readRun(await createServerSupabase(), context, id.data); return run ? privateJson(run) : privateJson({ error: "Run unavailable." },404); } catch(error) { return accessResponse(error); }
}
