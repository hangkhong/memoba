import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createServer } from "vite";
import { z } from "zod";

// This runs the production agent and knowledge adapters without writing runs or briefs.
// The synthetic question and tool arguments stay in a private local artifact.
export async function runObservedScenario({ scenario, models, client, context, modules, onUpdate = () => {} }) {
  const { executionLimits } = modules.limits;
  const report = { version: 2, mode: "in-process-nonpersistent", scenario: scenario.id, fixtureReview: "pending", expectations: { expectedSources: scenario.expectedSources, reviewFor: scenario.reviewFor }, turns: [], note: "Source IDs are recorded when submitted to a model step. The observer does not prove provider receipt if that step fails. No analysis or brief is persisted." };
  const history = [];
  for (const question of scenario.messages) {
    const runId = randomUUID();
    const turn = { question, runId, trace: [], answer: null, citedSources: [], usage: null, durationMs: null, termination: { status: "incomplete", code: null } };
    report.turns.push(turn);
    onUpdate(report);
    const started = performance.now();
    try {
      const deadline = Date.now() + executionLimits.deadlineMs;
      const abort = AbortSignal.timeout(executionLimits.deadlineMs);
      const repository = modules.knowledgeRepository.knowledgeRepository(client, context, models.embed, models.embeddingModel, abort);
      const knowledge = modules.knowledgeService.createRunKnowledge(repository, runId);
      const trace = (event) => { turn.trace.push(event); onUpdate(report); };
      const agent = modules.agent.textReasoningAdapter(models.reasoning, knowledge, async () => {}, trace);
      const store = modules.analysisRepository.analysisRepository(client, context);
      const request = modules.schema.textRunInputSchema.parse({ version: 2, message: question, history });
      const result = await modules.harness.runTextAnalysis(request, {
        ...agent, trace, disclosed: knowledge.disclosed, canRead: store.canRead, emit: async () => {}, deadlineAt: deadline,
        finish: async (status, answer, snapshots, code, usage) => {
          turn.answer = answer?.text ?? null;
          const sources = new Map(snapshots.map((item) => [item.evidenceId, item]));
          turn.citedSources = answer?.citations.map((citation) => {
            const source = sources.get(citation.evidenceId);
            return { ...citation, source: !source ? null : source.source === "document" ? { documentId: source.documentId, revisionId: source.revisionId, block: source.block } : { caseId: source.caseId, revisionId: source.revisionId, sectionKey: source.sectionKey } };
          }) ?? [];
          turn.usage = usage;
          turn.termination = { status, code };
          onUpdate(report);
          return status === "complete" ? randomUUID() : null;
        },
      });
      turn.termination = { status: result.status, code: result.code };
    } catch (error) {
      turn.termination = { status: "incomplete", code: error instanceof Error ? error.name : "UNKNOWN_ERROR" };
    } finally {
      turn.durationMs = Math.round(performance.now() - started);
      onUpdate(report);
    }
    if (turn.termination.status !== "complete" || !turn.answer) break;
    history.push({ role: "user", text: question }, { role: "assistant", text: turn.answer });
  }
  return report;
}

export async function runLocalTrace(scenario) {
  const env = z.object({ NEXT_PUBLIC_SUPABASE_URL: z.url(), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1), DEMO_EMAIL: z.string().min(1), DEMO_PASSWORD: z.string().min(12) }).parse(process.env);
  const endpoint = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  if (endpoint.protocol !== "http:" || !["localhost", "127.0.0.1", "::1"].includes(endpoint.hostname)) throw new Error("Trace evaluation requires a local Supabase endpoint.");
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await client.auth.signInWithPassword({ email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD });
  if (login.error) throw new Error("Demo login failed.");
  const identity = await client.auth.getUser();
  if (identity.error || !identity.data.user) throw new Error("Demo identity unavailable.");
  const memberships = await client.from("workspace_members").select("workspace_id").eq("user_id", identity.data.user.id).limit(2);
  if (memberships.error) throw new Error("Workspace membership unavailable.");
  const [{ workspace_id: workspaceId }] = z.array(z.object({ workspace_id: z.uuid() })).length(1).parse(memberships.data);
  const workspace = await client.from("workspaces").select("id,name,knowledge_version").eq("id", workspaceId).single();
  if (workspace.error) throw new Error("Workspace unavailable.");
  const vite = await createServer({ configFile: resolve("vitest.config.ts"), server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  try {
    const paths = { models: "/src/lib/ai/models.ts", limits: "/src/lib/contracts/limits.ts", auth: "/src/lib/auth/schema.ts", schema: "/src/modules/analysis/schema.ts", agent: "/src/modules/analysis/agent.ts", harness: "/src/modules/analysis/harness.ts", analysisRepository: "/src/modules/analysis/repository.ts", knowledgeRepository: "/src/modules/knowledge/repository.ts", knowledgeService: "/src/modules/knowledge/service.ts" };
    const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await vite.ssrLoadModule(path)]));
    const modules = Object.fromEntries(entries);
    const context = modules.auth.workspaceContextSchema.parse({ userId: identity.data.user.id, workspaceId: workspace.data.id, workspaceName: workspace.data.name, knowledgeVersion: workspace.data.knowledge_version });
    const directory = resolve(".superpowers/evals/text");
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const file = resolve(directory, `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}-trace.json`);
    const onUpdate = (report) => writeFileSync(file, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
    const report = await runObservedScenario({ scenario, models: modules.models.configuredModels(), client, context, modules, onUpdate });
    process.stdout.write(`Evaluation artifact: ${file}\n`);
    if (report.turns.length !== scenario.messages.length || report.turns.some((turn) => turn.termination.status !== "complete")) process.exitCode = 1;
  } finally { await vite.close(); await client.auth.signOut(); }
}
