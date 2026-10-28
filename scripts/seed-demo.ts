import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { mkdirSync, writeFileSync } from "node:fs";
import { readAIConfig } from "../src/lib/config/env.ts";
import { createEmbeddingAdapter } from "../src/lib/ai/embeddings.ts";
import { createCaseService } from "../src/modules/cases/service.ts";
import { savedCaseSchema } from "../src/modules/cases/contracts.ts";
import { localCases, challengeCases, corpusConceptId, rolloutConceptId, reconciliationConceptId } from "../evals/local-v0/corpus.ts";
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
  const login = await client.auth.signInWithPassword({ email: values.DEMO_EMAIL, password: values.DEMO_PASSWORD });
  if (login.error) throw new Error("Demo sign-in failed; existing passwords are preserved.");
  const admin = createClient<Database>(local.url, local.secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const concepts = await admin.from("concepts").upsert([
    { id: corpusConceptId, workspace_id: workspaceId, kind: "system", label: "Synthetic demo corpus", aliases: ["demo"] },
    { id: rolloutConceptId, workspace_id: workspaceId, kind: "approach", label: "Controlled rollout", aliases: ["canary", "triển khai có kiểm soát"] },
    { id: reconciliationConceptId, workspace_id: workspaceId, kind: "problem_type", label: "Receivables reconciliation", aliases: ["đối soát công nợ"] },
  ], { onConflict: "id" });
  if (concepts.error) throw new Error("Cannot seed concepts.");
  if (!process.argv.includes("--cases") && !process.argv.includes("--challenge")) { process.stdout.write("Seeded local accounts and fixed concepts. Pass --cases or --challenge explicitly to index a corpus with the real model.\n"); return; }
  const ai = readAIConfig(process.env);
  if (ai.kind !== "configured") { process.stdout.write("Seeded workspace and accounts. AI is unavailable; case seeding requires real embeddings.\n"); return; }
  const google = createGoogleGenerativeAI({ apiKey: ai.value.GOOGLE_GENERATIVE_AI_API_KEY });
  const embed = createEmbeddingAdapter({ model: google.embedding(ai.value.AI_EMBEDDING_MODEL), dimensions: ai.value.AI_EMBEDDING_DIMENSIONS });
  const fixtures = process.argv.includes("--challenge") ? challengeCases : localCases;
  const manifest: { slug: string; caseId: string; revisionId: string; archived: boolean }[] = [];
  for (const fixture of fixtures) {
    const listed = await client.from("case_revisions").select("id,case_id,index_state").eq("workspace_id", workspaceId).contains("content", { title: fixture.input.title }).order("created_at", { ascending: false }).limit(1);
    if (listed.error) throw new Error("Cannot inspect seed revisions.");
    const existing = z.array(z.object({ id: z.uuid(), case_id: z.uuid(), index_state: z.enum(["pending", "ready", "failed"]) })).parse(listed.data)[0];
    const store = {
      async save() { const result = await client.rpc("save_case_revision", { w: workspaceId, input: fixture.input }); if (result.error) throw new Error("Cannot seed case."); return savedCaseSchema.parse(result.data); },
      async revision(id: string) { const result = await client.from("case_revisions").select("id,case_id,index_state").eq("id",id).single(); if (result.error) throw new Error("Cannot read seed revision."); const row=z.object({ id:z.uuid(),case_id:z.uuid(),index_state:z.enum(["pending","ready","failed"]) }).parse(result.data); return { caseId:row.case_id,revisionId:row.id,indexState:row.index_state,input:fixture.input }; },
      async index(id: string, sections: { key: string; text: string; embedding: number[] }[]) { const result=await client.rpc("publish_case_revision", {r:id,sections,model:ai.value.AI_EMBEDDING_MODEL,dimensions:ai.value.AI_EMBEDDING_DIMENSIONS});if(result.error)throw new Error("Cannot publish seed revision.");return savedCaseSchema.parse(result.data); },
      async fail(id: string) { const result=await client.rpc("fail_case_index",{r:id});if(result.error)throw new Error("Cannot record index failure."); },
    };
    const service = createCaseService(store, embed);
    const saved = existing?.index_state === "ready" ? { caseId: existing.case_id,revisionId: existing.id,indexState: existing.index_state } : existing ? await service.reindex(existing.id) : await service.save(fixture.input);
    if (saved.indexState !== "ready") throw new Error("Real embedding failed while seeding.");
    manifest.push({ slug: fixture.slug,caseId:saved.caseId,revisionId:saved.revisionId,archived:fixture.archived??false });
  }
  const canary=manifest.find((item)=>item.slug==="rollout-canary"); const legacy=manifest.find((item)=>item.slug==="rollout-legacy"); const onboarding=manifest.find((item)=>item.slug==="onboarding-checklist");
  if(canary && legacy) { const result=await client.rpc("link_cases",{source:canary.caseId,target:legacy.caseId,relation:"supersedes",reason:"Controlled release replaced the old manual procedure.",archive_target:true});if(result.error)throw new Error("Cannot seed supersedes relation."); }
  if(canary && onboarding) { const result=await client.rpc("link_cases",{source:canary.caseId,target:onboarding.caseId,relation:"related_to",reason:"Both use pilots and explicit review checkpoints; domain applicability must be checked.",archive_target:false});if(result.error)throw new Error("Cannot seed cross-domain relation."); }
  mkdirSync(".superpowers/evals",{recursive:true});writeFileSync(".superpowers/evals/seed.json",JSON.stringify(manifest,null,2)+"\n");
  process.stdout.write(`Seeded ${manifest.length} labelled synthetic cases with real embeddings and fixed concepts. Existing users were preserved.\n`);
}
seed().catch((error: unknown) => { process.stderr.write(error instanceof Error ? error.message + "\n" : "Seed failed.\n"); process.exitCode = 1; });
