import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { ConversationError, deleteConversation } from "./repository";

const clientFailing = (code?: string) => ({ rpc: async () => ({ error: code ? { code } : null }) }) as unknown as SupabaseClient<Database>;
const id = "30000000-0000-4000-8000-000000000080";

it("maps the delete RPC outcomes to the conversation errors", async () => {
  await expect(deleteConversation(clientFailing(), id)).resolves.toBeUndefined();
  await expect(deleteConversation(clientFailing("42501"), id)).rejects.toMatchObject({ status: 404 });
  await expect(deleteConversation(clientFailing("23505"), id)).rejects.toMatchObject({ status: 409, message: expect.stringContaining("still running") });
  await expect(deleteConversation(clientFailing("XX000"), id)).rejects.toBeInstanceOf(ConversationError);
});
