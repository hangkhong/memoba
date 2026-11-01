import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSlugger, extractHeadings } from "./headings";
import { resolveDocLink, repositoryUrl, rewriteDocLinks } from "./links";
import { docPages, neighbours } from "./registry";
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
  it("sends everything else in the repository to GitHub", () => {
    expect(resolveDocLink("../reference/evaluation.md#not-established", "product/what-memoba-leaves-out.md", "/docs").href).toBe(`${repositoryUrl}/blob/main/docs/reference/evaluation.md#not-established`);
    expect(resolveDocLink("../../src/lib/contracts/limits.ts", "engine/how-the-agent-answers.md", "/docs").href).toBe(`${repositoryUrl}/blob/main/src/lib/contracts/limits.ts`);
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
        } else if (link.kind === "github") {
          expect(existsSync(join(process.cwd(), link.repoPath)), `${page.file} -> ${href}`).toBe(true);
          if (link.hash && link.repoPath.endsWith(".md")) expect(extractHeadings(readFileSync(join(process.cwd(), link.repoPath), "utf8")).map((heading) => `#${heading.id}`), `${page.file} -> ${href}`).toContain(link.hash);
        } else if (link.kind === "anchor") {
          expect(extractHeadings(read(page.file)).map((heading) => `#${heading.id}`), `${page.file} -> ${href}`).toContain(link.href);
        }
      }
    }
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
    expect(tree.children[0]).toMatchObject({ type: "docsDiagram", data: { hName: "docs-diagram", hProperties: { name: "agent-run" } } });
  });
});
