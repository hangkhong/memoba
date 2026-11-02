import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { holdSources, type KnowledgeStore } from "@/modules/knowledge/service";
import { earlierSources } from "./ledger";
import { readConversation } from "./repository";

// The sources held for one turn: everything earlier completed answers cited, each with where it stands now.
export async function loadHeldEvidence(client: SupabaseClient<Database>, context: WorkspaceContext, turnId: string, store: KnowledgeStore) {
  const turn = await client.from("conversation_turns").select("conversation_id,position").eq("workspace_id", context.workspaceId).eq("id", turnId).maybeSingle();
  const row = z.object({ conversation_id: z.uuid(), position: z.number().int() }).nullable().parse(turn.error ? null : turn.data);
  if (!row) throw new Error("TURN_UNAVAILABLE");
  const detail = await readConversation(client, context, row.conversation_id);
  if (!detail) throw new Error("CONVERSATION_UNAVAILABLE");
  return holdSources(store, earlierSources(detail.turns.filter((entry) => entry.position < row.position)));
}
