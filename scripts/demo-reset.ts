import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { demoCases } from "../evals/demo/corpus.ts";
import { resolveTarget } from "./target.ts";
import type { Database } from "../src/lib/supabase/database.types.ts";

// Same ID as scripts/seed-demo.ts. The reset refuses any other workspace. The ID is the identity, so a database that still holds an older workspace name is accepted and the seed renames it.
const demoWorkspace = { id: "20000000-0000-4000-8000-000000000010" };
const countsSchema = z.record(z.string(), z.number());

async function reset() {
  const target = resolveTarget(process.argv, process.env);
  const client = createClient<Database>(target.url, target.secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const workspace = await client.from("workspaces").select("id").eq("id", demoWorkspace.id).maybeSingle();
  if (workspace.error || !workspace.data) throw new Error("Refusing to reset: the target has no demo workspace with the expected ID.");
  const cases = await client.from("cases").select("id,latest_revision_id").eq("workspace_id", demoWorkspace.id);
  if (cases.error) throw new Error("Cannot list cases.");
  const latestIds = cases.data.flatMap((row) => row.latest_revision_id ? [row.latest_revision_id] : []);
  const revisions = latestIds.length ? await client.from("case_revisions").select("id,content").in("id", latestIds) : { data: [], error: null };
  if (revisions.error) throw new Error("Cannot read case titles.");
  const seedTitles = new Set(demoCases.map((item) => item.input.title));
  const titleByRevision = new Map(revisions.data.map((row) => [row.id, z.object({ title: z.string() }).safeParse(row.content).data?.title]));
  const keep = cases.data.filter((row) => row.latest_revision_id && seedTitles.has(titleByRevision.get(row.latest_revision_id) ?? "")).map((row) => row.id);
  const result = await client.rpc("reset_demo_workspace", { w: demoWorkspace.id, keep_case_ids: keep });
  if (result.error) throw new Error("Reset failed.");
  process.stdout.write(`Kept ${keep.length} seed cases. Removed: ${JSON.stringify(countsSchema.parse(result.data))}\n`);
  // Seeding skips cases that are already indexed, so only missing seed cases cost embeddings.
  const seedArgs = ["--env-file-if-exists=.env.local", "--experimental-strip-types", "scripts/seed-demo.ts", "--demo", ...(target.kind === "remote" ? ["--remote"] : [])];
  execFileSync(process.execPath, seedArgs, { stdio: "inherit" });
  // Conversations need the running app and a real model, so they are seeded only when its URL is given.
  const appFlag = process.argv.indexOf("--app-url");
  if (appFlag >= 0 || process.env.APP_URL) execFileSync(process.execPath, ["--env-file-if-exists=.env.local", "--experimental-strip-types", "scripts/seed-conversations.ts", ...(appFlag >= 0 ? ["--app-url", process.argv[appFlag + 1] ?? ""] : [])], { stdio: "inherit" });
  else process.stdout.write("No --app-url or APP_URL given: the three demo conversations were not re-created. Run npm run demo:conversations -- --app-url <url>.\n");
}
reset().catch((error: unknown) => { process.stderr.write(error instanceof Error ? error.message + "\n" : "Reset failed.\n"); process.exitCode = 1; });
