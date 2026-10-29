import type { Root, RootContent, PhrasingContent } from "mdast";
import type { TextAnswer } from "./schema";
import type { EvidenceItem } from "@/modules/knowledge/contracts";

type CitationOptions = { prefix: string; markers: Record<string, string> };
// Streamdown keys parser caches by plugin name and serialized options. Keep this
// plugin free of per-render closures so another answer cannot reuse stale sources.
export function remarkCitations({ prefix, markers }: CitationOptions) {
  return (tree: Root) => {
    const numbered = new Map<string, number>();
    function transform(parent: Root | RootContent) {
      if (!("children" in parent) || parent.type === "link" || parent.type === "linkReference") return;
      for (let index = 0; index < parent.children.length; index++) {
        const child = parent.children[index];
        if (!child) continue;
        if (child.type !== "text") { transform(child); continue; }
        const replacements: PhrasingContent[] = [];
        let offset = 0;
        for (const match of child.value.matchAll(/\[S:[0-9a-f-]{36}:[1-9][0-9]*\]/g)) {
          const evidenceId = markers[match[0]];
          if (!evidenceId) continue;
          if (match.index > offset) replacements.push({ type: "text", value: child.value.slice(offset, match.index) });
          const number = numbered.get(evidenceId) ?? numbered.size + 1;
          numbered.set(evidenceId, number);
          replacements.push({ type: "link", url: `#citation/${prefix}/${number}/${evidenceId}`, children: [{ type: "text", value: `[${number}]` }] });
          offset = match.index + match[0].length;
        }
        if (!replacements.length) continue;
        if (offset < child.value.length) replacements.push({ type: "text", value: child.value.slice(offset) });
        parent.children.splice(index, 1, ...replacements);
        index += replacements.length - 1;
      }
    }
    transform(tree);
  };
}
export function citationPresentation(answer: TextAnswer, evidence: readonly EvidenceItem[], prefix: string) {
  const sources = new Map(evidence.map((item) => [item.evidenceId, item]));
  const markers = Object.fromEntries(answer.citations.filter((citation) => sources.has(citation.evidenceId)).map((citation) => [citation.marker, citation.evidenceId]));
  const citedIds = new Set(Object.values(markers));
  const plugin: [typeof remarkCitations, CitationOptions] = [remarkCitations, { prefix, markers }];
  return { plugin, resolve(href: string) {
    const base = `#citation/${prefix}/`;
    if (!href.startsWith(base)) return undefined;
    const [position, evidenceId, extra] = href.slice(base.length).split("/");
    const number = Number(position);
    const item = evidenceId && citedIds.has(evidenceId) ? sources.get(evidenceId) : undefined;
    return item && !extra && Number.isSafeInteger(number) && number > 0 ? { number, evidence: item } : undefined;
  } };
}
