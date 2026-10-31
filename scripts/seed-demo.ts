import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { mkdirSync, writeFileSync } from "node:fs";
import { readAIConfig } from "../src/lib/config/env.ts";
import { configuredModels } from "../src/lib/ai/models.ts";
import { workspaceContextSchema } from "../src/lib/auth/schema.ts";
import { caseRepository } from "../src/modules/cases/repository.ts";
import { createCaseService } from "../src/modules/cases/service.ts";
import { savedCaseSchema } from "../src/modules/cases/contracts.ts";
import { caseInputSchema } from "../src/modules/cases/schema.ts";
import { documentRepository } from "../src/modules/documents/repository.ts";
import { createDocumentService } from "../src/modules/documents/service.ts";
import { demoDocuments } from "../evals/demo/documents.ts";
import { localCases, challengeCases, corpusConceptId, rolloutConceptId, reconciliationConceptId } from "../evals/local-v0/corpus.ts";
import { demoCases, demoConcepts } from "../evals/demo/corpus.ts";
import { resolveTarget } from "./target.ts";
import type { Database } from "../src/lib/supabase/database.types.ts";

const seedConfig = z.object({ DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12).max(128) });
const userSchema = z.object({ id: z.uuid(), email: z.email() });
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortKeys(item)]));
  return value;
}
async function seed() {
  const config = seedConfig.safeParse(process.env);
  if (!config.success) throw new Error("Set DEMO_EMAIL and DEMO_PASSWORD (12+ characters) in .env.local.");
  const values = config.data;
  const local = resolveTarget(process.argv, process.env);
  const demo = process.argv.includes("--demo");
  const client = createClient<Database>(local.url, local.secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const listed = await client.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (listed.error) throw new Error("Local Auth unavailable.");
  const users = z.array(userSchema).parse(listed.data.users);
  async function ensureUser(email: string) {
    const existing = users.find((user) => user.email === email);
    if (existing) {
      const updated = await client.auth.admin.updateUserById(existing.id, { password: values.DEMO_PASSWORD, email_confirm: true });
      if (updated.error) throw new Error("Cannot update local demo user password.");
      return existing.id;
    }
    const result = await client.auth.admin.createUser({ email, password: values.DEMO_PASSWORD, email_confirm: true });
    if (result.error) throw new Error("Cannot create local demo user.");
    return userSchema.parse(result.data.user).id;
  }
  const userId = await ensureUser(values.DEMO_EMAIL);
  if (local.kind === "local") await ensureUser("outsider@memoba.local");
  const workspaceId = "20000000-0000-4000-8000-000000000010";
  const workspace = await client.from("workspaces").upsert({ id: workspaceId, name: "Memory Bank Demo" }, { onConflict: "id" });
  if (workspace.error) throw new Error("Cannot seed workspace.");
  const membership = await client.from("workspace_members").upsert({ user_id: userId, workspace_id: workspaceId, role: "owner" }, { onConflict: "workspace_id,user_id" });
  if (membership.error) throw new Error("Cannot seed membership.");
  const login = await client.auth.signInWithPassword({ email: values.DEMO_EMAIL, password: values.DEMO_PASSWORD });
  if (login.error) throw new Error("Demo sign-in failed after the password was set; check Auth configuration.");
  const admin = createClient<Database>(local.url, local.secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const conceptRows = demo ? demoConcepts.map((concept) => ({ ...concept, workspace_id: workspaceId, aliases: [...concept.aliases] })) : [
    { id: corpusConceptId, workspace_id: workspaceId, kind: "system", label: "Synthetic demo corpus", aliases: ["demo"] },
    { id: rolloutConceptId, workspace_id: workspaceId, kind: "approach", label: "Controlled rollout", aliases: ["canary", "triển khai có kiểm soát"] },
    { id: reconciliationConceptId, workspace_id: workspaceId, kind: "problem_type", label: "Receivables reconciliation", aliases: ["đối soát công nợ"] },
  ];
  const concepts = await admin.from("concepts").upsert(conceptRows, { onConflict: "id" });
  if (concepts.error) throw new Error("Cannot seed concepts.");
  if (!demo && !process.argv.includes("--cases") && !process.argv.includes("--challenge")) { process.stdout.write("Seeded local accounts and fixed concepts. Pass --demo, --cases or --challenge explicitly to index a corpus with the real model.\n"); return; }
  const ai = readAIConfig(process.env);
  // The demo needs process documents too, and the reset removes them, so a demo seed without embeddings must not look like success.
  if (ai.kind !== "configured" && demo) throw new Error("The demo seed needs a configured embedding model for cases and documents. Set AI_EMBEDDING_MODEL and its API key in .env.local.");
  if (ai.kind !== "configured") { process.stdout.write("Seeded workspace and accounts. AI is unavailable; case seeding requires real embeddings.\n"); return; }
  const models = configuredModels();
  const context = { workspaceId: workspaceContextSchema.shape.workspaceId.parse(workspaceId) };
  const fixtures = demo ? demoCases : process.argv.includes("--challenge") ? challengeCases : localCases;
  const manifest: { slug: string; caseId: string; revisionId: string; archived: boolean }[] = [];
  for (const fixture of fixtures) {
    const listed = await client.from("case_revisions").select("id,case_id,index_state,embedding_model,embedding_dimensions,content").eq("workspace_id", workspaceId).contains("content", { title: fixture.input.title }).order("created_at", { ascending: false }).limit(1);
    if (listed.error) throw new Error("Cannot inspect seed revisions.");
    const existing = z.array(z.object({ id: z.uuid(), case_id: z.uuid(), index_state: z.enum(["pending", "ready", "failed"]), embedding_model: z.string(), embedding_dimensions: z.number(), content: z.unknown() })).parse(listed.data)[0];
    const service = createCaseService(caseRepository(client, context, models, existing?.case_id), models.embed);
    let saved;
    if (existing) {
      const record = await client.from("cases").select("lifecycle,published_revision_id,latest_revision_id").eq("id", existing.case_id).eq("workspace_id", workspaceId).single();
      if (record.error) throw new Error("Cannot inspect seed case.");
      if (record.data.lifecycle === "archived") {
        if (!fixture.archived) throw new Error("An active seed fixture was archived. Preserve it and use a separate demo corpus.");
        manifest.push({ slug: fixture.slug, caseId: existing.case_id, revisionId: existing.id, archived: true });
        continue;
      }
      // Changed fixture content becomes a new immutable revision; unchanged content is never re-embedded.
      if (!fixture.archived && JSON.stringify(sortKeys(existing.content)) !== JSON.stringify(sortKeys(caseInputSchema.parse(fixture.input)))) saved = await service.save(fixture.input);
      else if (existing.embedding_model === models.embeddingModel && existing.embedding_dimensions === models.dimensions) saved = await service.reindex(existing.id);
      else {
        const source = record.data.published_revision_id ?? record.data.latest_revision_id;
        if (!source) throw new Error("Seed case has no source revision.");
        const prepared = await client.rpc("prepare_case_embedding_revision", { w: workspaceId, target_case: existing.case_id, source_revision: source, model: models.embeddingModel, dimensions: models.dimensions });
        if (prepared.error) throw new Error("Cannot prepare seed embedding migration. Resolve pending edits first.");
        saved = await service.reindex(savedCaseSchema.parse(prepared.data).revisionId);
      }
    } else saved = await service.save(fixture.input);
    if (saved.indexState !== "ready") throw new Error("Real embedding failed while seeding.");
    manifest.push({ slug: fixture.slug,caseId:saved.caseId,revisionId:saved.revisionId,archived:fixture.archived??false });
  }
  const canary=manifest.find((item)=>item.slug==="rollout-canary"); const legacy=manifest.find((item)=>item.slug==="rollout-legacy"); const onboarding=manifest.find((item)=>item.slug==="onboarding-checklist");
  if(canary && legacy) { const result=await client.rpc("link_cases",{source:canary.caseId,target:legacy.caseId,relation:"supersedes",reason:"Controlled release replaced the old manual procedure.",archive_target:true});if(result.error)throw new Error("Cannot seed supersedes relation."); }
  if(canary && onboarding) { const result=await client.rpc("link_cases",{source:canary.caseId,target:onboarding.caseId,relation:"related_to",reason:"Both use pilots and explicit review checkpoints; domain applicability must be checked.",archive_target:false});if(result.error)throw new Error("Cannot seed cross-domain relation."); }
  const documentIds: string[] = [];
  if (demo) {
    const documents = createDocumentService(documentRepository(client, context, models), models.embed, models);
    for (const fixture of demoDocuments) {
      const listed = await client.from("document_revisions").select("document_id,content").eq("workspace_id", workspaceId).contains("content", { title: fixture.input.title }).order("created_at", { ascending: false }).limit(1);
      if (listed.error) throw new Error("Cannot inspect seed documents.");
      const existing = z.array(z.object({ document_id: z.uuid() })).parse(listed.data)[0];
      if (existing) {
        const record = await client.from("documents").select("lifecycle").eq("id", existing.document_id).eq("workspace_id", workspaceId).single();
        if (record.error) throw new Error("Cannot inspect seed document.");
        if (record.data.lifecycle === "archived") throw new Error("A seed document was archived. Run npm run demo:reset to restore the demo documents.");
      }
      // Unchanged content returns the current revision without an embedding call; changed content becomes a new revision.
      const result = await documents.save(fixture.input, existing?.document_id ?? null);
      if (result.kind !== "saved") throw new Error(`Seed document "${fixture.input.title}" was not saved: ${result.kind === "invalid" ? result.errors.join(" ") : "unavailable"}`);
      documentIds.push(result.saved.documentId);
    }
  }
  mkdirSync(".superpowers/evals",{recursive:true});writeFileSync(".superpowers/evals/seed.json",JSON.stringify(manifest,null,2)+"\n");
  process.stdout.write(`Seeded ${manifest.length} cases${demo ? ` and ${documentIds.length} process documents` : ""} with index state ready on the configured embedding profile. Archived history was preserved and the demo user password now matches DEMO_PASSWORD.\n`);
}
seed().catch((error: unknown) => { process.stderr.write(error instanceof Error ? error.message + "\n" : "Seed failed.\n"); process.exitCode = 1; });
