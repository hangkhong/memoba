import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { configuredModels } from "../src/lib/ai/models.ts";
import { workspaceContextSchema } from "../src/lib/auth/schema.ts";
import { caseRepository } from "../src/modules/cases/repository.ts";
import { savedCaseSchema } from "../src/modules/cases/contracts.ts";
import { createCaseService } from "../src/modules/cases/service.ts";
import { readLocalStack } from "./local-stack.ts";
import type { Database } from "../src/lib/supabase/database.types.ts";

const caseSchema = z.object({ id: z.uuid(), published_revision_id: z.uuid().nullable(), latest_revision_id: z.uuid().nullable() });
const profileSchema = z.object({ id: z.uuid(), index_state: z.string(), embedding_model: z.string(), embedding_dimensions: z.number() });

async function migrate() {
  const credentials = z.object({ DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12) }).safeParse(process.env);
  if (!credentials.success) throw new Error("DEMO_CREDENTIALS_REQUIRED");
  const models = configuredModels();
  const local = readLocalStack();
  const client = createClient<Database>(local.url, local.publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const login = await client.auth.signInWithPassword({ email: credentials.data.DEMO_EMAIL, password: credentials.data.DEMO_PASSWORD });
  if (login.error || !login.data.user) throw new Error("DEMO_SIGN_IN_FAILED");
  const context = { workspaceId: workspaceContextSchema.shape.workspaceId.parse("20000000-0000-4000-8000-000000000010"), userId: login.data.user.id };
  const member = await client.from("workspace_members").select("workspace_id").eq("workspace_id", context.workspaceId).eq("user_id", context.userId).single();
  if (member.error) throw new Error("WORKSPACE_ACCESS_DENIED");
  async function activeCases() {
    const result = await client.from("cases").select("id,published_revision_id,latest_revision_id").eq("workspace_id", context.workspaceId).eq("lifecycle", "active").order("id");
    if (result.error) throw new Error("CASE_LIST_FAILED");
    return z.array(caseSchema).parse(result.data);
  }
  const cases = await activeCases();
  const service = createCaseService(caseRepository(client, context, models), models.embed);
  let indexed = 0;
  for (const record of cases) {
    const source = record.published_revision_id ?? record.latest_revision_id;
    if (!source) throw new Error("CASE_HAS_NO_SOURCE_REVISION");
    const prepared = await client.rpc("prepare_case_embedding_revision", { w: context.workspaceId, target_case: record.id, source_revision: source, model: models.embeddingModel, dimensions: models.dimensions });
    if (prepared.error) {
      process.stderr.write(JSON.stringify({ code: "MIGRATION_PREPARE_FAILED", caseId: record.id, databaseCode: prepared.error.code }) + "\n");
      throw new Error("MIGRATION_PREPARE_FAILED");
    }
    const revision = savedCaseSchema.parse(prepared.data);
    const saved = await service.reindex(revision.revisionId);
    if (saved.indexState !== "ready") throw new Error("MIGRATION_INDEX_FAILED");
    if (revision.indexState !== "ready") indexed++;
    const published = await client.from("cases").select("published_revision_id").eq("id", record.id).eq("workspace_id", context.workspaceId).single();
    if (published.error || published.data.published_revision_id !== saved.revisionId) throw new Error("MIGRATION_PUBLICATION_CHANGED");
    process.stdout.write(JSON.stringify({ caseId: saved.caseId, revisionId: saved.revisionId, indexState: saved.indexState }) + "\n");
  }
  const finalCases = await activeCases();
  const ids = finalCases.flatMap((record) => record.published_revision_id ? [record.published_revision_id] : []);
  const profiles = ids.length ? await client.from("case_revisions").select("id,index_state,embedding_model,embedding_dimensions").eq("workspace_id", context.workspaceId).in("id", ids) : { data: [], error: null };
  if (profiles.error) throw new Error("MIGRATION_VERIFICATION_FAILED");
  const revisions = z.array(profileSchema).parse(profiles.data);
  if (ids.length !== finalCases.length || revisions.length !== finalCases.length || revisions.some((revision) => revision.index_state !== "ready" || revision.embedding_model !== models.embeddingModel || revision.embedding_dimensions !== models.dimensions)) throw new Error("MIGRATION_INCOMPLETE");
  process.stdout.write(JSON.stringify({ kind: "complete", model: models.embeddingModel, dimensions: models.dimensions, activeCases: finalCases.length, indexed, reused: cases.length - indexed }) + "\n");
}

migrate().catch((error: unknown) => {
  process.stderr.write(JSON.stringify({ code: error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "MIGRATION_FAILED" }) + "\n");
  process.exitCode = 1;
});
