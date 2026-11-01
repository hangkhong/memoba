import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSlugger, extractHeadings } from "./headings";
import { resolveDocLink, rewriteDocLinks } from "./links";
import { docPages, neighbours } from "./registry";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { docDiagrams } from "./diagrams";
import { combine, examples } from "./diagrams/two-searches";
import { moments, summary } from "./diagrams/edit-goes-live";
import { sources, verdict } from "./diagrams/seen-read-cited";
import { diagramName, docsRemarkPlugin } from "./remark-docs";

const read = (file: string) => readFileSync(join(process.cwd(), "docs", file), "utf8");
const linkPattern = /\[[^\]]*\]\(([^)\s]+)\)/g;
const withoutFences = (markdown: string) => markdown.replace(/^(```+|~~~+)[^\n]*\n[\s\S]*?^\1\s*$/gm, "");

describe("registry", () => {
  it("lists the pages in the order docs/README.md links them", () => {
    const readme = read("README.md");
    const listed = [...readme.matchAll(/^\d\. \[[^\]]+\]\(((?:product|engine)\/[^)]+\.md)\)/gm)].map((match) => match[1]);
    expect(docPages.map((page) => page.file)).toEqual(listed);
  });
  it("matches each title to the page's own H1 and each slug to its file name", () => {
    for (const page of docPages) {
      expect(read(page.file).split("\n")[0]).toBe(`# ${page.title}`);
      expect(page.file.endsWith(`/${page.slug}.md`)).toBe(true);
    }
  });
  it("links neighbours in reading order", () => {
    expect(neighbours(docPages[0]?.slug ?? "").previous).toBeNull();
    expect(neighbours("what-memoba-believes").next?.slug).toBe("what-memoba-leaves-out");
    expect(neighbours(docPages.at(-1)?.slug ?? "").next).toBeNull();
  });
});

describe("heading anchors", () => {
  it("follows GitHub's slug rules, including repeats", () => {
    const slug = createSlugger();
    expect([slug('"None" and "failed" are different answers'), slug("Same"), slug("Same")]).toEqual(["none-and-failed-are-different-answers", "same", "same-1"]);
  });
  it("has no repeated heading in any page, so ids never need a suffix", () => {
    for (const page of docPages) {
      const ids = extractHeadings(read(page.file)).map((heading) => heading.id);
      expect(new Set(ids).size, page.file).toBe(ids.length);
    }
  });
  it("ignores headings inside code fences", () => {
    expect(extractHeadings("## Real\n```bash\n# comment\n```\n### Also real").map((heading) => heading.id)).toEqual(["real", "also-real"]);
  });
  it("gives the rendered headings the same ids as the contents list", () => {
    const tree = { type: "root", children: [{ type: "heading", depth: 2, children: [{ type: "text", value: "Keyword " }, { type: "inlineCode", value: "search" }, { type: "text", value: " finds it" }] }] };
    docsRemarkPlugin()()(tree);
    expect(tree.children[0]).toMatchObject({ data: { hProperties: { id: "keyword-search-finds-it" } } });
    expect(extractHeadings("## Keyword `search` finds it")[0]?.id).toBe("keyword-search-finds-it");
  });
});

describe("links", () => {
  it("sends links between pages to the app route and keeps the anchor", () => {
    expect(resolveDocLink("how-an-answer-stays-checkable.md#sources-are-frozen", "engine/how-the-agent-answers.md", "/workspace/docs")).toMatchObject({ kind: "page", href: "/workspace/docs/how-an-answer-stays-checkable#sources-are-frozen" });
    expect(resolveDocLink("../engine/how-knowledge-gets-in.md", "product/what-memoba-believes.md", "/docs").href).toBe("/docs/how-knowledge-gets-in");
  });
  it("refuses a relative link to anything that is not a registered page, so a reader is never sent into the repository", () => {
    expect(() => resolveDocLink("../reference/evaluation.md#not-established", "product/what-memoba-leaves-out.md", "/docs")).toThrow(/not a registered docs page/);
    expect(() => resolveDocLink("../../src/lib/contracts/limits.ts", "engine/how-the-agent-answers.md", "/docs")).toThrow(/not a registered docs page/);
    expect(() => rewriteDocLinks("See [x](../reference/evaluation.md).", "product/what-memoba-leaves-out.md", "/docs")).toThrow();
  });
  it("leaves in-page anchors and absolute URLs alone", () => {
    expect(resolveDocLink("#top", "engine/x.md", "/docs")).toEqual({ kind: "anchor", href: "#top" });
    expect(resolveDocLink("https://example.com/a", "engine/x.md", "/docs").kind).toBe("external");
  });
  it("rewrites inline links in the source and leaves code fences alone", () => {
    const source = "See [a](../engine/how-knowledge-gets-in.md#x) and [b](#top).\n```md\n[c](../engine/how-knowledge-gets-in.md)\n```";
    expect(rewriteDocLinks(source, "product/what-memoba-believes.md", "/workspace/docs")).toBe("See [a](/workspace/docs/how-knowledge-gets-in#x) and [b](#top).\n```md\n[c](../engine/how-knowledge-gets-in.md)\n```");
  });
  it("leaves no dead link in any page", () => {
    for (const page of docPages) {
      const links = [...withoutFences(read(page.file)).matchAll(linkPattern)].map((match) => match[1] ?? "");
      for (const href of links) {
        const link = resolveDocLink(href, page.file, "/docs");
        if (link.kind === "page") {
          const target = docPages.find((candidate) => candidate.slug === link.page.slug);
          if (link.hash) expect(extractHeadings(read(target?.file ?? "")).map((heading) => `#${heading.id}`), `${page.file} -> ${href}`).toContain(link.hash);
        } else if (link.kind === "anchor") {
          expect(extractHeadings(read(page.file)).map((heading) => `#${heading.id}`), `${page.file} -> ${href}`).toContain(link.href);
        }
      }
    }
  });
});

describe("reader pages", () => {
  it("link only to registered pages, to their own anchors, and to external sites that are not the repository", () => {
    for (const page of docPages) {
      for (const [, href = ""] of withoutFences(read(page.file)).matchAll(linkPattern)) {
        expect(() => resolveDocLink(href, page.file, "/docs"), `${page.file} -> ${href}`).not.toThrow();
        expect(href, `${page.file} -> ${href}`).not.toMatch(/github\.com\/hangkhong/i);
      }
    }
  });
  it("name no file, function, tool, or SQL object in code formatting", () => {
    const readerCode = /^(\.[a-z0-9]+|[A-Za-z]+\/[A-Za-z]+)$/;
    for (const page of docPages) {
      const spans = [...withoutFences(read(page.file)).matchAll(/`([^`\n]+)`/g)].map((match) => match[1] ?? "");
      for (const span of spans) expect(span, `${page.file}: \`${span}\``).toMatch(readerCode);
    }
  });
  it("show no internal identifier in their text or in the diagram text", () => {
    const internal = /\b(read_case|read_document|search_knowledge(_documents)?|publish_document|ts_rank_cd|validateTextAnswer|caseInputSchema|splitDocument)\b|\[S:[a-z0-9-]+:\d+\]|\.(ts|tsx|sql)\b/;
    for (const page of docPages) expect(read(page.file), page.file).not.toMatch(internal);
    for (const [name, Diagram] of Object.entries(docDiagrams)) expect(renderToStaticMarkup(createElement(Diagram)), name).not.toMatch(internal);
  });
});

describe("diagram markers", () => {
  it("recognises a standalone marker and nothing else", () => {
    expect(diagramName("<!-- diagram: agent-run -->")).toBe("agent-run");
    expect(diagramName("<!-- a note -->")).toBeNull();
  });
  it("turns a marker into a docs-diagram element", () => {
    const tree = { type: "root", children: [{ type: "html", value: "<!-- diagram: agent-run -->" }] };
    docsRemarkPlugin()()(tree);
    expect(tree.children[0]).toMatchObject({ type: "docsDiagram", data: { hName: "docs-diagram", hProperties: { diagram: "agent-run" } } });
  });
});

const markersIn = (markdown: string) => withoutFences(markdown).split("\n").map(diagramName).filter((name): name is string => name !== null);

describe("engine diagrams", () => {
  it("resolves every marker in every page to a registered component", () => {
    const used = docPages.flatMap((page) => markersIn(read(page.file)).map((name) => ({ name, file: page.file })));
    expect(used.length).toBeGreaterThan(0);
    for (const { name, file } of used) expect(docDiagrams[name], `${file}: ${name}`).toBeTypeOf("function");
  });
  it("registers no diagram that no page uses", () => {
    const used = new Set(docPages.flatMap((page) => markersIn(read(page.file))));
    for (const name of Object.keys(docDiagrams)) expect(used.has(name), name).toBe(true);
  });
  it("leaves no Mermaid block in the engine pages", () => {
    for (const page of docPages) expect(read(page.file), page.file).not.toMatch(/^```mermaid/m);
  });
  it("renders each diagram with a text alternative and no empty output", () => {
    for (const [name, Diagram] of Object.entries(docDiagrams)) {
      const html = renderToStaticMarkup(createElement(Diagram));
      expect(html, name).toMatch(/role="group" aria-label="[^"]{40,}"/);
    }
  });
  it("combines two ranked lists so a section in both comes first", () => {
    const [name] = examples;
    const merged = combine(name?.keyword ?? [], name?.meaning ?? []);
    expect(merged[0]?.in).toEqual(["keyword", "meaning"]);
    expect(merged.map(({ hit }) => hit.id)).toEqual(["sync", "billing", "cutover", "close"]);
    expect(combine([], examples[1]?.meaning ?? []).every((entry) => entry.in.join() === "meaning")).toBe(true);
  });
  it("allows a citation only for a source that was read, under the heading that fits it", () => {
    const find = (id: string) => sources.find((source) => source.id === id)!;
    expect(verdict(find("s1"), "case").allowed).toBe(false);
    expect(verdict(find("r1"), "case").allowed).toBe(true);
    expect(verdict(find("r1"), "doc").allowed).toBe(false);
    expect(verdict(find("c2"), "doc").allowed).toBe(true);
    expect(verdict(find("c2"), "case").allowed).toBe(false);
  });
  it("keeps answers on the old version until a case is ready, and stores nothing when a document fails", () => {
    expect(moments("case", "failed")[1].using).toBe("v1");
    expect(moments("case", "failed")[2].using).toBe("v1");
    expect(moments("case", "ready")[2].using).toBe("v2");
    expect(moments("doc", "failed")[2].stored.map((version) => version.label)).toEqual(["v1"]);
    expect(summary("doc", "failed")).toMatch(/no half-published rule/);
  });
});
