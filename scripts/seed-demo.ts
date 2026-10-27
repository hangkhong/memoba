import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { readLocalStack } from "./local-stack.ts";
import type { Database } from "../src/lib/supabase/database.types.ts";

const seedConfig = z.object({ DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12).max(128) });
const userSchema = z.object({ id: z.uuid(), email: z.email() });
async function seed() {
  const config = seedConfig.safeParse(process.env);
  if (!config.success) throw new Error("Set DEMO_EMAIL and DEMO_PASSWORD (12+ characters) in .env.local.");
  const values = config.data;
  const local = readLocalStack();
  const client = createClient<Database>(local.url, local.secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const listed = await client.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (listed.error) throw new Error("Local Auth unavailable.");
  const users = z.array(userSchema).parse(listed.data.users);
  async function ensureUser(email: string) {
    const existing = users.find((user) => user.email === email);
    if (existing) return existing.id;
    const result = await client.auth.admin.createUser({ email, password: values.DEMO_PASSWORD, email_confirm: true });
    if (result.error) throw new Error("Cannot create local demo user.");
    return userSchema.parse(result.data.user).id;
  }
  const userId = await ensureUser(values.DEMO_EMAIL);
  await ensureUser("outsider@memoba.local");
  const workspaceId = "20000000-0000-4000-8000-000000000010";
  const workspace = await client.from("workspaces").upsert({ id: workspaceId, name: "Memory Bank Demo" }, { onConflict: "id" });
  if (workspace.error) throw new Error("Cannot seed workspace.");
  const membership = await client.from("workspace_members").upsert({ user_id: userId, workspace_id: workspaceId, role: "owner" }, { onConflict: "workspace_id,user_id" });
  if (membership.error) throw new Error("Cannot seed membership.");
  process.stdout.write("Seeded one local workspace, a demo member, and a nonmember test account. Existing users were preserved. Case corpus awaits model verification.\n");
}
seed().catch((error: unknown) => { process.stderr.write(error instanceof Error ? error.message + "\n" : "Seed failed.\n"); process.exitCode = 1; });
