import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { caseService } from "@/modules/cases/runtime";
import { caseDetail } from "@/modules/cases/repository";
import { createServerSupabase } from "@/lib/supabase/server";
export async function POST(request: Request, { params }: { params: Promise<{ id: string; revisionId: string }> }) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid origin." }, 400);
  try {
    const context = await requireWorkspace(); const input = z.object({ id: z.uuid(), revisionId: z.uuid() }).safeParse(await params);
    if (!input.success) return privateJson({ error: "Case unavailable." }, 404);
    const detail = await caseDetail(await createServerSupabase(), context, input.data.id);
    if (!detail?.revisions.some((revision) => revision.id === input.data.revisionId)) return privateJson({ error: "Revision unavailable." }, 404);
    return privateJson(await (await caseService(context)).reindex(input.data.revisionId));
  } catch (error) { return accessResponse(error); }
}
