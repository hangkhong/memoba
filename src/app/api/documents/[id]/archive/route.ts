import { z } from "zod";
import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid origin." }, 400);
  try {
    await requireWorkspace(); const id = z.uuid().safeParse((await params).id);
    if (!id.success) return privateJson({ error: "Document unavailable." }, 404);
    const result = await (await createServerSupabase()).rpc("archive_document", { d: id.data });
    return result.error ? privateJson({ error: "Document unavailable." }, 404) : privateJson({ kind: "archived" });
  } catch (error) { return accessResponse(error); }
}
