import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { caseInputSchema } from "@/modules/cases/schema";
import { caseService } from "@/modules/cases/runtime";
import { caseDetail } from "@/modules/cases/repository";
type RouteContext = { params: Promise<{ id: string }> };
export async function GET(_request: Request, route: RouteContext) {
  try {
    const context = await requireWorkspace(); const id = z.uuid().safeParse((await route.params).id);
    if (!id.success) return privateJson({ error: "Case unavailable." }, 404);
    const detail = await caseDetail(await createServerSupabase(), context, id.data);
    return detail ? privateJson(detail) : privateJson({ error: "Case unavailable." }, 404);
  } catch (error) { return accessResponse(error); }
}
export async function PATCH(request: Request, route: RouteContext) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid origin." }, 400);
  try {
    const context = await requireWorkspace(); const id = z.uuid().safeParse((await route.params).id);
    const input = caseInputSchema.safeParse(await request.json().catch(() => null));
    if (!input.success || !id.success) return privateJson({ error: "Review the case fields." }, 400);
    if (!await caseDetail(await createServerSupabase(), context, id.data)) return privateJson({ error: "Case unavailable." }, 404);
    return privateJson(await (await caseService(context, id.data)).save(input.data));
  } catch (error) { return accessResponse(error); }
}
