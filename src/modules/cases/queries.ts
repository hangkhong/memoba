import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import type { WorkspaceContext } from "@/lib/auth/schema";
export async function listConcepts(context: WorkspaceContext) {
  const result = await (await createServerSupabase()).from("concepts").select("id,label").eq("workspace_id", context.workspaceId).order("label");
  if (result.error) throw new Error("CONCEPTS_UNAVAILABLE");
  return z.array(z.object({ id: z.uuid(), label: z.string() })).parse(result.data);
}
