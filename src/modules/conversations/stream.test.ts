import { createUIMessageStream, createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { describe, expect, it } from "vitest";
import { readAnalysisStream } from "./stream";

const runId = "30000000-0000-4000-8000-000000000001";
const briefId = "40000000-0000-4000-8000-000000000001";
const activity = { stage: "retrieval", state: "completed", count: 2, at: "2026-10-28T10:00:00Z" };

function responseBody(chunks: UIMessageChunk[]) {
  const stream = createUIMessageStream({ execute: ({ writer }) => { for (const chunk of chunks) writer.write(chunk); } });
  const body = createUIMessageStreamResponse({ stream }).body;
  if (!body) throw new Error("Missing test stream");
  return body;
}

describe("analysis stream boundary", () => {
  it("reports the admitted run and actual activity before its saved brief result", async () => {
    const events: string[] = [];
    const result = await readAnalysisStream(responseBody([
      { type: "start", messageId: runId },
      { type: "data-run", data: { runId } },
      { type: "data-activity", data: activity },
      { type: "data-result", data: { status: "complete", briefId, code: null } },
      { type: "finish" },
    ]), (event) => { events.push(event.kind); });
    expect(result).toEqual({ runId, outcome: { status: "complete", briefId, code: null } });
    expect(events).toEqual(["run", "activity", "result"]);
  });

  it("forwards draft answer chunks between the run and its result", async () => {
    const chunks: unknown[] = [];
    await readAnalysisStream(responseBody([
      { type: "start", messageId: runId },
      { type: "data-run", data: { runId } },
      { type: "data-draft", data: { kind: "delta", text: "Hello" }, transient: true },
      { type: "data-draft", data: { kind: "reset" }, transient: true },
      { type: "data-result", data: { status: "complete", briefId, code: null } },
      { type: "finish" },
    ]), (event) => { if (event.kind === "draft") chunks.push(event.chunk); });
    expect(chunks).toEqual([{ kind: "delta", text: "Hello" }, { kind: "reset" }]);
  });

  it("rejects a draft that arrives before the run is admitted", async () => {
    await expect(readAnalysisStream(responseBody([
      { type: "start", messageId: runId },
      { type: "data-draft", data: { kind: "delta", text: "Early" }, transient: true },
      { type: "finish" },
    ]), () => {})).rejects.toThrow("Unexpected analysis draft");
  });

  it.each(["gap_report", "cancelled", "timed_out", "failed"])("preserves the authoritative %s result", async (status) => {
    const result = await readAnalysisStream(responseBody([
      { type: "data-run", data: { runId } },
      { type: "data-result", data: { status, briefId: null, code: status === "gap_report" ? null : "TEST_ERROR" } },
    ]), () => {});
    expect(result.outcome.status).toBe(status);
  });

  it("does not treat an interrupted event stream as completed analysis", async () => {
    await expect(readAnalysisStream(responseBody([
      { type: "data-run", data: { runId } },
      { type: "data-activity", data: activity },
    ]), () => {})).rejects.toThrow("without a saved result");
  });

  it("rejects an invented complete result without a saved brief", async () => {
    await expect(readAnalysisStream(responseBody([
      { type: "data-run", data: { runId } },
      { type: "data-result", data: { status: "complete", briefId: null, code: null } },
    ]), () => {})).rejects.toThrow();
  });

  it("rejects changing run identity within a stream", async () => {
    await expect(readAnalysisStream(responseBody([
      { type: "data-run", data: { runId } },
      { type: "data-run", data: { runId: briefId } },
    ]), () => {})).rejects.toThrow("run changed");
  });

  it("surfaces protocol errors instead of hiding them as empty activity", async () => {
    await expect(readAnalysisStream(responseBody([
      { type: "data-run", data: { runId } },
      { type: "error", errorText: "Analysis unavailable" },
    ]), () => {})).rejects.toThrow("stream failed");
    await expect(readAnalysisStream(responseBody([
      { type: "data-run", data: { runId } },
      { type: "data-activity", data: { ...activity, stage: "invented_thought" } },
    ]), () => {})).rejects.toThrow();
  });

  it("cancels the source after malformed activity instead of leaving the response open", async () => {
    let cancelled = false;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "data-run", data: { runId } })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "data-activity", data: { ...activity, stage: "invalid" } })}\n\n`));
      },
      cancel() { cancelled = true; },
    });
    await expect(readAnalysisStream(body, () => {})).rejects.toThrow();
    expect(cancelled).toBe(true);
  });
});
