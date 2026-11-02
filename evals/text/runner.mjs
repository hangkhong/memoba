import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { request as playwrightRequest } from "@playwright/test";
import { z } from "zod";

const scenarioSchema = z.object({ id: z.string().min(1), corpus: z.enum(["challenge", "demo"]).default("challenge"), messages: z.array(z.string().min(1)).min(1), expectedSources: z.array(z.string()), expectedDocuments: z.array(z.string()).default([]), reviewFor: z.array(z.string()).min(1) }).strict();
const idSchema = z.uuid();
const runSchema = z.object({ status: z.string(), error_code: z.string().nullable(), usage: z.unknown().nullable(), briefId: z.uuid().nullable() });
const answerSchema = z.object({ generated: z.object({ version: z.literal(2), text: z.string(), citations: z.array(z.object({ marker: z.string(), evidenceId: z.uuid() })) }), evidence: z.array(z.object({ evidenceId: z.uuid(), revisionId: z.uuid() }).passthrough()) });

// The stream is authoritative for tool activity. An absent event is not a zero-result search.
export function parseEventBlock(block) {
  const data = block.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
  if (!data || data === "[DONE]") return null;
  return JSON.parse(data);
}

export async function readEvents(body, onChunk) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const blocks = pending.split(/\r?\n\r?\n/);
      pending = blocks.pop() ?? "";
      for (const block of blocks) { const item = parseEventBlock(block); if (item) onChunk(item); }
      if (done) break;
    }
    if (pending.trim()) { const item = parseEventBlock(pending); if (item) onChunk(item); }
  } finally { reader.releaseLock(); }
}

function parseArgs(args) {
  if (args.length !== 3 || !["--live", "--trace-live"].includes(args[0]) || args[1] !== "--scenario") throw new Error("Use --live or --trace-live with --scenario <id> to run one explicitly selected scenario.");
  return { mode: args[0], scenarioId: args[2] };
}

async function main() {
  const { mode, scenarioId } = parseArgs(process.argv.slice(2));
  const scenarios = z.array(scenarioSchema).parse(JSON.parse(await readFile(new URL("./scenarios.json", import.meta.url), "utf8")));
  const scenario = scenarios.find((item) => item.id === scenarioId);
  if (!scenario) throw new Error("Unknown scenario. See evals/text/scenarios.json.");
  if (mode === "--trace-live") {
    const { runLocalTrace } = await import("./in-process.mjs");
    await runLocalTrace(scenario);
    return;
  }
  const base = new URL(process.env.MEMOBA_EVAL_URL ?? "http://localhost:3100");
  if (base.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(base.hostname) || base.pathname !== "/" || base.search || base.hash || base.username || base.password) throw new Error("Evaluation is restricted to a local HTTP server.");
  const env = z.object({ DEMO_EMAIL: z.string().min(1), DEMO_PASSWORD: z.string().min(12) }).parse(process.env);
  const api = await playwrightRequest.newContext({ baseURL: base.origin, extraHTTPHeaders: { origin: base.origin } });
  const directory = resolve(".artifacts/evals/text");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = resolve(directory, `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.json`);
  const report = { version: 1, scenario: scenario.id, fixtureReview: "pending", expectations: { expectedSources: scenario.expectedSources, expectedDocuments: scenario.expectedDocuments, reviewFor: scenario.reviewFor }, conversationId: null, turns: [], note: "Tool inputs, all delivered source IDs, and correction attempts are not exposed by the current API. Citation validity does not establish semantic support." };
  const save = async () => writeFile(file, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  const post = async (path, data, extraHeaders = {}) => {
    const response = await api.post(path, { data, headers: extraHeaders });
    if (!response.ok()) throw new Error(`HTTP ${response.status()} for ${path.replace(/[0-9a-f-]{36}/g, ":id")}`);
    return response.json();
  };
  try {
    await post("/api/auth/login", { email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD });
    const conversationId = randomUUID();
    await post("/api/conversations", { id: conversationId });
    report.conversationId = conversationId;
    await save();
    let parentTurnId = null;
    for (const question of scenario.messages) {
      const turn = { question, turnId: null, runId: null, toolCalls: [], toolEvents: [], toolInputs: null, deliveredSourceIds: null, citationFailures: null, correctionAttempts: null, answer: null, citedSources: null, usage: null, durationMs: null, termination: { status: "incomplete", code: null } };
      report.turns.push(turn);
      const start = performance.now();
      try {
        const saved = z.object({ turnId: idSchema }).parse(await post(`/api/conversations/${conversationId}/turns`, { key: randomUUID(), parentTurnId, message: question }));
        turn.turnId = saved.turnId;
        const state = await api.storageState();
        const cookie = state.cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
        const response = await fetch(`${base.origin}/api/conversations/${conversationId}/turns/${saved.turnId}/analyses`, { method: "POST", headers: { origin: base.origin, cookie, "Idempotency-Key": randomUUID() }, signal: AbortSignal.timeout(330_000) });
        if (!response.ok || !response.body) throw new Error(`Analysis HTTP ${response.status}`);
        turn.runId = idSchema.parse(response.headers.get("x-run-id"));
        await save();
        await readEvents(response.body, (chunk) => {
          if (chunk.type === "data-activity" && chunk.data?.stage === "tool" && typeof chunk.data.tool === "string") {
            turn.toolEvents.push({ name: chunk.data.tool, state: chunk.data.state, at: chunk.data.at });
            if (chunk.data.state === "started") turn.toolCalls.push({ name: chunk.data.tool, at: chunk.data.at });
          }
          if (chunk.type === "data-result" && typeof chunk.data?.status === "string") turn.termination = { status: chunk.data.status, code: chunk.data.code ?? null };
        });
      } catch (error) {
        turn.termination = { status: "incomplete", code: error instanceof Error ? error.name : "UNKNOWN_ERROR" };
      } finally {
        turn.durationMs = Math.round(performance.now() - start);
        if (turn.runId) {
          try {
            const response = await api.get(`/api/analyses/${turn.runId}`);
            if (response.ok()) {
              const run = runSchema.parse(await response.json());
              turn.termination = { status: run.status, code: run.error_code };
              turn.usage = run.usage;
              if (run.error_code === "INVALID_CITATION") turn.citationFailures = ["INVALID_CITATION"];
              if (run.briefId) {
                const briefResponse = await api.get(`/api/briefs/${run.briefId}`);
                if (briefResponse.ok()) {
                  const brief = answerSchema.parse(await briefResponse.json());
                  turn.answer = brief.generated.text;
                  turn.citedSources = brief.generated.citations.map((citation) => ({ ...citation, source: brief.evidence.find((source) => source.evidenceId === citation.evidenceId) ?? null }));
                }
              }
            }
          } catch { /* An unavailable saved read is recorded by the null fields. */ }
        }
        await save();
      }
      if (turn.termination.status !== "complete") break;
      parentTurnId = savedTurnId(turn);
    }
    process.stdout.write(`Evaluation artifact: ${file}\n`);
    if (report.turns.length !== scenario.messages.length || report.turns.some((turn) => turn.termination.status !== "complete")) process.exitCode = 1;
  } finally { await save(); await api.dispose(); }
}

function savedTurnId(turn) { return idSchema.parse(turn.turnId); }

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { process.stderr.write(`Evaluation failed: ${error instanceof Error ? error.message : "unknown error"}\n`); process.exitCode = 1; });
