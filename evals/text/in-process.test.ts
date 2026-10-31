import { expect, it, vi } from "vitest";
import { streamedModel } from "@/modules/analysis/streamed-model";
import { z } from "zod";
import { caseEvidenceSchema as evidenceSchema } from "@/modules/knowledge/contracts";
import * as agent from "@/modules/analysis/agent";
import * as harness from "@/modules/analysis/harness";
import * as schema from "@/modules/analysis/schema";
import * as knowledgeService from "@/modules/knowledge/service";
import * as limits from "@/lib/contracts/limits";
import { runLocalTrace, runObservedScenario } from "./in-process.mjs";

it("refuses to send evaluation credentials to a non-local database", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "not-a-secret");
  vi.stubEnv("DEMO_EMAIL", "demo@example.invalid");
  vi.stubEnv("DEMO_PASSWORD", "synthetic-password");
  try { await expect(runLocalTrace({ id: "test", messages: [], expectedSources: [], reviewFor: [] })).rejects.toThrow("local Supabase"); }
  finally { vi.unstubAllEnvs(); }
});

it("records actual tool calls and submitted source identity without recording source text", async () => {
  const source = evidenceSchema.parse({ evidenceId: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionId: crypto.randomUUID(), sectionId: crypto.randomUUID(), sectionKey: "approach", caseTitle: "Synthetic pilot", excerpt: "Private synthetic source text", outcome: "unknown", authorId: crypto.randomUUID(), recordedAt: new Date().toISOString(), sources: [], purpose: "method", retrievalReason: "test" });
  let call = 0;
  const model = streamedModel({ doGenerate: async ({ prompt }) => {
    call++;
    const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
    if (call === 1) return { content: [{ type: "tool-call", toolCallId: "search", toolName: "search_knowledge", input: JSON.stringify({ query: "pilot" }) }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] };
    if (call === 2) return { content: [{ type: "tool-call", toolCallId: "read", toolName: "read_case", input: JSON.stringify({ caseIds: [source.caseId], sectionKeys: ["approach"] }) }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] };
    const marker = JSON.stringify(prompt).match(/\[S:[0-9a-f-]{36}:[0-9]+\]/)?.[0];
    expect(marker).toBeDefined();
    return { content: [{ type: "text", text: `The pilot was proposed ${marker}.` }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
  } });
  const store = { search: async () => ({ cases: { kind: "success" as const, items: [source] }, documents: { kind: "empty" as const, items: [] as [] } }), readDocument: async () => ({ kind: "empty" as const, items: [] as [] }), read: async () => ({ kind: "success" as const, items: [source] }), expand: async () => ({ kind: "empty" as const, items: [] as [] }) };
  const report = await runObservedScenario({ scenario: { id: "synthetic", messages: ["What happened?"], expectedSources: [], reviewFor: ["support"] }, models: { reasoning: model, embed: async () => ({ kind: "error", code: "unused", retryable: false }), embeddingModel: "test" }, client: {}, context: {}, modules: { agent, harness, schema, knowledgeService, limits, knowledgeRepository: { knowledgeRepository: () => store }, analysisRepository: { analysisRepository: () => ({ canRead: async () => true }) } } });
  const parsed = z.object({ turns: z.array(z.object({ termination: z.object({ status: z.string() }), trace: z.array(z.object({ kind: z.string() }).passthrough()), citedSources: z.array(z.unknown()) })) }).parse(report);
  const turn = parsed.turns[0];
  if (!turn) throw new Error("No recorded turn");
  expect(turn.termination.status).toBe("complete");
  expect(turn.trace.filter((event) => event.kind === "tool_call")).toMatchObject([{ name: "search_knowledge", input: { query: "pilot" } }, { name: "read_case", input: { caseIds: [source.caseId] } }]);
  expect(turn.trace.filter((event) => event.kind === "model_sources")).toMatchObject([{ sources: [{ evidenceId: source.evidenceId, revisionId: source.revisionId, sectionKey: "approach" }] }]);
  expect(JSON.stringify(report)).not.toContain(source.excerpt);
  expect(turn.citedSources).toMatchObject([{ evidenceId: source.evidenceId, source: { caseId: source.caseId, revisionId: source.revisionId } }]);
});
