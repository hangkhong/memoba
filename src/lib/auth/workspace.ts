import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { workspaceContextSchema } from "./schema";

export class AccessError extends Error {
  constructor(public readonly status: 401 | 404 | 503) { super(status === 401 ? "Sign in to continue." : status === 404 ? "Workspace unavailable for this account." : "Workspace service unavailable."); }
}
const membershipSchema = z.array(z.object({ workspace_id: z.uuid() })).length(1);
const workspaceSchema = z.object({ id: z.uuid(), name: z.string(), knowledge_version: z.number().int().nonnegative() });

// Cached per request so the layout and the page share one lookup; failures replay as the same AccessError.
export const requireWorkspace = cache(async function requireWorkspace() {
  const supabase = await createServerSupabase();
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError || !identity.user) throw new AccessError(401);
  const memberships = await supabase.from("workspace_members").select("workspace_id").eq("user_id", identity.user.id).limit(2);
  if (memberships.error) throw new AccessError(503);
  const parsed = membershipSchema.safeParse(memberships.data);
  if (!parsed.success) throw new AccessError(404);
  const membership = parsed.data[0];
  if (!membership) throw new AccessError(404);
  const workspaceResult = await supabase.from("workspaces").select("id,name,knowledge_version").eq("id", membership.workspace_id).single();
  if (workspaceResult.error) throw new AccessError(404);
  const workspace = workspaceSchema.parse(workspaceResult.data);
  return workspaceContextSchema.parse({ userId: identity.user.id, workspaceId: workspace.id, workspaceName: workspace.name, knowledgeVersion: workspace.knowledge_version });
});
