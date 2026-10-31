import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { documentDetail } from "@/modules/documents/repository";
import { documentService } from "@/modules/documents/runtime";
import { respondToSave } from "@/modules/documents/http";
type RouteContext = { params: Promise<{ id: string }> };
export async function GET(_request: Request, route: RouteContext) {
  try {
    const context = await requireWorkspace(); const id = z.uuid().safeParse((await route.params).id);
    if (!id.success) return privateJson({ error: "Document unavailable." }, 404);
    const detail = await documentDetail(await createServerSupabase(), context, id.data);
    return detail ? privateJson(detail) : privateJson({ error: "Document unavailable." }, 404);
  } catch (error) { return accessResponse(error); }
}
// Editing publishes a new revision; the previous one and its citations stay as they were.
export async function PATCH(request: Request, route: RouteContext) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid origin." }, 400);
  try {
    const context = await requireWorkspace(); const id = z.uuid().safeParse((await route.params).id);
    if (!id.success) return privateJson({ error: "Document unavailable." }, 404);
    const body = await request.json().catch(() => null);
    return await respondToSave(async () => (await documentService(context)).save(body, id.data));
  } catch (error) { return accessResponse(error); }
}
