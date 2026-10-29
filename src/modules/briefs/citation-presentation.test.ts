import { expect, it } from "vitest";
import type { Root } from "mdast";
import { evidenceSchema } from "@/modules/knowledge/contracts";
import { citationPresentation } from "./citation-presentation";
const id = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
const marker = `[S:${id}:1]`;
const other = `[S:${id}:2]`;
const source = evidenceSchema.parse({ evidenceId: id, caseId: id, revisionId: id, sectionId: id, sectionKey: "lessons", caseTitle: "Checkout", excerpt: "Keep rollback available.", outcome: "achieved", authorId: id, recordedAt: "2026-10-29T12:00:00Z", sources: [], purpose: "method", retrievalReason: "Related release" });
const answer = { version: 2, text: marker, citations: [{ marker, evidenceId: id }, { marker: other, evidenceId: second }] } as const;
it("numbers first prose appearance, reuses numbers, and preserves code and invalid markers", () => {
  const presentation = citationPresentation({ ...answer, citations: [...answer.citations] }, [source, { ...source, evidenceId: second }], "test");
  const tree: Root = { type: "root", children: [{ type: "code", value: marker }, { type: "paragraph", children: [{ type: "inlineCode", value: marker }, { type: "text", value: `Advice ${other} then ${marker} again ${other} [S:${id}:9]` }] }] };
  presentation.plugin[0](presentation.plugin[1])(tree);
  expect(JSON.stringify(tree)).toContain(`#citation/test/1/${second}`);
  expect(JSON.stringify(tree)).toContain(`#citation/test/2/${id}`);
  expect(presentation.resolve(`#citation/test/1/${second}`)?.evidence.evidenceId).toBe(second);
  expect(tree.children[0]).toEqual({ type: "code", value: marker });
  expect(JSON.stringify(tree)).toContain(`[S:${id}:9]`);
});
it("does not create citations without authorized saved evidence", () => {
  const presentation = citationPresentation({ ...answer, citations: [...answer.citations] }, [], "test");
  const tree: Root = { type: "root", children: [{ type: "paragraph", children: [{ type: "text", value: marker }] }] };
  presentation.plugin[0](presentation.plugin[1])(tree);
  expect(presentation.resolve(`#citation/test/1/${id}`)).toBeUndefined();
  expect(JSON.stringify(tree)).not.toContain("#citation/");
});
