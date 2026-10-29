import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseEventBlock, readEvents } from "./runner.mjs";
import { challengeCases } from "../local-v0/corpus";

describe("evaluation stream records", () => {
  it("reads actual events across byte boundaries", async () => {
    const bytes = new TextEncoder().encode('data: {"type":"data-activity","data":{"stage":"tool","state":"started","tool":"search_cases"}}\n\ndata: {"type":"data-result","data":{"status":"complete"}}\n\ndata: [DONE]\n\n');
    const stream = new ReadableStream({ start(controller) { controller.enqueue(bytes.slice(0, 17)); controller.enqueue(bytes.slice(17, 91)); controller.enqueue(bytes.slice(91)); controller.close(); } });
    const events: unknown[] = [];
    await readEvents(stream, (item: unknown) => events.push(item));
    expect(events).toEqual([{ type: "data-activity", data: { stage: "tool", state: "started", tool: "search_cases" } }, { type: "data-result", data: { status: "complete" } }]);
  });
  it("rejects malformed events and ignores the stream terminator", () => {
    expect(parseEventBlock("data: [DONE]")).toBeNull();
    expect(() => parseEventBlock("data: {bad}")).toThrow();
  });
  it("defines the planned use cases without treating expectations as reviewed", async () => {
    const cases: { id: string; messages: string[]; expectedSources: string[]; reviewFor: string[] }[] = JSON.parse(await readFile(new URL("./scenarios.json", import.meta.url), "utf8"));
    expect(cases.map(({ id }) => id)).toEqual(["direct-precedent", "complementary-cases", "failed-precedent", "changed-conditions", "conflicting-cases", "no-precedent", "ambiguous", "referential-follow-up"]);
    expect(cases.find(({ id }) => id === "referential-follow-up")?.messages).toHaveLength(2);
    expect(cases.every(({ reviewFor }) => reviewFor.length > 0)).toBe(true);
    const slugs = new Set(challengeCases.map((item) => item.slug));
    for (const scenario of cases) for (const slug of scenario.expectedSources) expect(slugs.has(slug), slug).toBe(true);
  });
});

it.skipIf(process.env.MEMOBA_EVAL_RUNNER_SMOKE !== "1")("records only observed activity and cited sources in a local scripted run", async () => {
  const { createServer } = await import("node:http");
  const { mkdtemp, readFile, readdir, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const runId = "00000000-0000-4000-8000-000000000001";
  const turnId = "00000000-0000-4000-8000-000000000002";
  const briefId = "00000000-0000-4000-8000-000000000003";
  const evidenceId = "00000000-0000-4000-8000-000000000004";
  const marker = `[S:${runId}:1]`;
  const server = createServer((req, res) => {
    const send = (value: unknown) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(value)); };
    if (req.url === "/api/auth/login") { res.setHeader("Set-Cookie", "session=test; Path=/; HttpOnly"); send({ kind: "success" }); }
    else if (req.url === "/api/conversations") send({ id: "created" });
    else if (req.url?.endsWith("/turns")) send({ turnId });
    else if (req.url?.endsWith("/analyses")) { res.writeHead(200, { "Content-Type": "text/event-stream", "X-Run-Id": runId }); res.end(`data: ${JSON.stringify({ type: "data-activity", data: { stage: "tool", state: "started", tool: "read_case", at: "2026-10-29T00:00:00Z" } })}\n\ndata: ${JSON.stringify({ type: "data-result", data: { status: "complete", briefId, code: null } })}\n\ndata: [DONE]\n\n`); }
    else if (req.url === `/api/analyses/${runId}`) send({ status: "complete", error_code: null, usage: { totalTokens: 2 }, briefId });
    else if (req.url === `/api/briefs/${briefId}`) send({ generated: { version: 2, text: `Pilot ${marker}`, citations: [{ marker, evidenceId }] }, evidence: [{ evidenceId, caseId: "00000000-0000-4000-8000-000000000005", revisionId: "00000000-0000-4000-8000-000000000006", sectionKey: "approach" }] });
    else { res.statusCode = 404; send({}); }
  });
  const dir = await mkdtemp(join(tmpdir(), "memoba-eval-"));
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test address");
    await promisify(execFile)(process.execPath, [resolve("evals/text/runner.mjs"), "--live", "--scenario", "direct-precedent"], { cwd: dir, env: { ...process.env, MEMOBA_EVAL_URL: `http://127.0.0.1:${address.port}`, DEMO_EMAIL: "test@example.invalid", DEMO_PASSWORD: "test-password-123" }, timeout: 7000 });
    const directory = join(dir, ".superpowers/evals/text");
    const [file] = await readdir(directory);
    if (!file) throw new Error("No evaluation artifact");
    const report = JSON.parse(await readFile(join(directory, file), "utf8"));
    expect(report.fixtureReview).toBe("pending");
    expect(report.turns[0]).toMatchObject({ toolCalls: [{ name: "read_case" }], deliveredSourceIds: null, toolInputs: null, correctionAttempts: null, answer: `Pilot ${marker}`, citedSources: [{ marker, evidenceId }], termination: { status: "complete", code: null } });
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
    await rm(dir, { recursive: true, force: true });
  }
}, 15000);
