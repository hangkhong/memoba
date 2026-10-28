import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/auth/schema";
import type { NormalizedRequest } from "@/modules/analysis/schema";
import { readRun } from "@/modules/analysis/repository";
import { readBrief } from "@/modules/briefs/repository";
import { conversationSchema, turnSchema, type TurnInput } from "./schema";

export class ConversationError extends Error {
  constructor(public readonly status: 404 | 409 | 503, message: string) { super(message); }
}
function databaseError(code: string): never {
  if (code === "42501") throw new ConversationError(404, "Conversation unavailable.");
  if (code === "23505") throw new ConversationError(409, "Conversation changed or already running. Refresh before sending again.");
  throw new ConversationError(503, "Conversation service unavailable.");
}
export async function listConversations(client: SupabaseClient<Database>, context: WorkspaceContext) {
  const result = await client.from("conversations").select("id,author_id,title,created_at,updated_at").eq("workspace_id", context.workspaceId).order("updated_at", { ascending: false }).limit(30);
  if (result.error) databaseError(result.error.code);
  return z.array(conversationSchema).parse(result.data);
}
export async function createConversation(client: SupabaseClient<Database>, context: WorkspaceContext, id: string) {
  const result = await client.rpc("create_conversation", { w: context.workspaceId, conversation: id });
  if (result.error) databaseError(result.error.code);
  return z.uuid().parse(result.data);
}
export async function saveTurn(client: SupabaseClient<Database>, conversationId: string, input: TurnInput, request: NormalizedRequest) {
  const result = await client.rpc("save_conversation_turn", { conversation: conversationId, parent: input.parentTurnId ?? undefined, key: input.key, body: input.message, input: request });
  if (result.error) databaseError(result.error.code);
  return z.uuid().parse(result.data);
}
export async function readConversation(client: SupabaseClient<Database>, context: WorkspaceContext, id: string) {
  const result = await client.from("conversations").select("*").eq("workspace_id", context.workspaceId).eq("id", id).maybeSingle();
  if (result.error) databaseError(result.error.code);
  if (!result.data) return null;
  const conversation = conversationSchema.parse(result.data);
  const rows = await client.from("conversation_turns").select("*").eq("workspace_id", context.workspaceId).eq("conversation_id", id).order("position");
  if (rows.error) databaseError(rows.error.code);
  const turns = z.array(turnSchema).parse(rows.data);
  const turnsWithRuns = await Promise.all(turns.map(async (turn) => {
    const attempts = await client.from("analysis_runs").select("id").eq("workspace_id", context.workspaceId).eq("conversation_turn_id", turn.id).order("created_at");
    if (attempts.error) databaseError(attempts.error.code);
    const ids = z.array(z.object({ id: z.uuid() })).parse(attempts.data);
    const runs = await Promise.all(ids.map(async ({ id: runId }) => {
      const run = await readRun(client, context, runId);
      if (!run) throw new ConversationError(503, "Saved analysis unavailable.");
      return { ...run, brief: run.briefId ? await readBrief(client, context, run.briefId) : null };
    }));
    return { ...turn, runs };
  }));
  return { conversation, turns: turnsWithRuns };
}
