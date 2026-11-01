import { createSlugger } from "./headings";

// A standalone HTML comment marks where a React diagram mounts. GitHub hides the comment, so the Markdown around it reads the same there.
const diagramMarker = /^<!--\s*diagram:\s*([a-z0-9][a-z0-9-]*)\s*-->$/;

export function diagramName(html: string): string | null {
  return diagramMarker.exec(html.trim())?.[1] ?? null;
}

type MdNode = { type: string; value?: string; url?: string; children?: unknown[]; data?: { hName?: string; hProperties?: Record<string, unknown> } };

function isNode(value: unknown): value is MdNode {
  return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

function textOf(node: MdNode): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value ?? "";
  return (node.children ?? []).filter(isNode).map(textOf).join("");
}

// Gives each heading its GitHub-style id and turns diagram markers into <docs-diagram diagram="..."> elements.
// It depends on the Markdown alone: the Markdown pipeline may reuse its output across pages, so nothing page-specific belongs here.
// Links are resolved at render time instead (see docs-article.tsx).
export function docsRemarkPlugin() {
  return () => (tree: unknown) => {
    const slug = createSlugger();
    const visit = (node: MdNode) => {
      if (node.type === "heading") node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: slug(textOf(node)) } };
      else if (node.type === "html") {
        const name = diagramName(node.value ?? "");
        if (name !== null) {
          node.type = "docsDiagram";
          node.value = undefined;
          node.data = { hName: "docs-diagram", hProperties: { diagram: name } };
        }
      }
      node.children?.filter(isNode).forEach(visit);
    };
    if (isNode(tree)) visit(tree);
  };
}
