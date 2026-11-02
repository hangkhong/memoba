import { describe, expect, it } from "vitest";
import { evaluateTurn } from "./checks.mjs";

const turn = (over: Record<string, unknown> = {}) => ({ question: "q", toolCalls: [] as { name: string; input?: unknown }[], answer: "Ok.", citedSources: [] as unknown[], termination: { status: "complete", code: null }, ...over });
const marker = "[S:00000000-0000-4000-8000-000000000000:1]";

describe("follow-up checks", () => {
  it("fails a transformation that searched again", () => {
    const result = evaluateTurn(turn({ toolCalls: [{ name: "search_knowledge", input: { query: "x" } }] }), { turn: 2, tools: "none" });
    expect(result.passed).toBe(false);
    expect(result.failures[0]).toContain("expected 0 tool calls");
  });
  it("requires citation markers to survive", () => {
    expect(evaluateTurn(turn(), { turn: 2, keepsCitations: true }).passed).toBe(false);
    expect(evaluateTurn(turn({ answer: `Ok ${marker}.` }), { turn: 2, keepsCitations: true }).passed).toBe(true);
  });
  it("wants Vietnamese prose and headings, not the English template", () => {
    const english = "## What the process says\n- Notice is required.";
    expect(evaluateTurn(turn({ answer: english }), { turn: 1, language: "vi" }).failures).toEqual(expect.arrayContaining(["answer is not Vietnamese", "answer kept English template headings"]));
    expect(evaluateTurn(turn({ answer: "## Quy trình nói gì\n- Cần báo trước 60 ngày." }), { turn: 1, language: "vi" }).passed).toBe(true);
    expect(evaluateTurn(turn({ answer: "## What the process says\nCần báo trước." }), { turn: 1, language: "vi" }).passed).toBe(false);
  });
  it("flags a re-read of a source an earlier answer already cited, and a missing re-read of the changed case", () => {
    const prior = [turn({ citedSources: [{ marker, evidenceId: "e", source: { caseId: "case-1", revisionId: "r" } }] })];
    const again = turn({ toolCalls: [{ name: "read_case", input: { caseIds: ["case-1"] } }] });
    expect(evaluateTurn(again, { turn: 2, onlyMissing: true }, { priorTurns: prior }).failures).toEqual(["re-read held sources: case-1"]);
    expect(evaluateTurn(again, { turn: 2, rereadsFixture: true }, { priorTurns: prior, fixtureCaseId: "case-1" }).passed).toBe(true);
    expect(evaluateTurn(turn({ toolCalls: [{ name: "search_knowledge", input: {} }] }), { turn: 2, rereadsFixture: true }, { fixtureCaseId: "case-1" }).failures).toEqual(["did not re-read the changed case"]);
  });
  it("does not pretend to observe tool inputs on a stream without them", () => {
    expect(evaluateTurn(turn(), { turn: 2, onlyMissing: true }, { inputs: false }).failures).toContain("tool inputs are not observable in this mode");
  });
  it("fails a run that did not complete", () => {
    expect(evaluateTurn(turn({ termination: { status: "failed", code: "INVALID_CITATION" } }), { turn: 2 }).failures).toEqual(["run ended failed (INVALID_CITATION)"]);
  });
});
