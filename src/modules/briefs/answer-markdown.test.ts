import { createElement } from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerMarkdown } from "./answer-markdown";
it("renders Markdown while excluding raw HTML and executable links", () => {
  const html = renderToStaticMarkup(createElement(AnswerMarkdown, { evidence: [], answer: { version: 2, text: '**Safe advice**\n\n1. Keep rollback ready.\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(2)">\n\n[unsafe](javascript:alert(3))', citations: [] } }));
  expect(html).toContain('<strong');
  expect(html).toContain('<ol');
  expect(html).not.toContain('<script');
  expect(html).not.toContain('<img');
  expect(html).not.toContain('href="javascript:');
});

it("keeps citation controls correct across cached parsers and multiple renders", async () => {
  const { evidenceSchema } = await import("@/modules/knowledge/contracts");
  for (const suffix of ['1', '2', '1']) {
    const id = `00000000-0000-4000-8000-00000000000${suffix}`;
    const marker = `[S:${id}:1]`;
    const source = evidenceSchema.parse({ evidenceId: id, caseId: id, revisionId: id, sectionId: id, sectionKey: 'lessons', caseTitle: `Release ${suffix}`, excerpt: 'Keep rollback available.', outcome: 'achieved', authorId: id, recordedAt: '2026-10-29T12:00:00Z', sources: [], purpose: 'method', retrievalReason: 'Related release' });
    const html = renderToStaticMarkup(createElement(AnswerMarkdown, { evidence: [source], answer: { version: 2, text: `Keep rollback ready. ${marker}`, citations: [{marker, evidenceId:id}] } }));
    expect(html).toContain(`Open source 1: Release ${suffix}`);
    expect(html).toContain('[1]');
    expect(html).not.toContain('href="#citation/');
  }
});
