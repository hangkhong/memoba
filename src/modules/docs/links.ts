import { posix } from "node:path";
import { findDocByFile, type DocPage } from "./registry";

export type ResolvedLink =
  | { kind: "anchor"; href: string }
  | { kind: "page"; href: string; page: DocPage; hash: string }
  | { kind: "external"; href: string };

// Reader pages link only to each other, to anchors in themselves, and to external sites. A relative link (written relative to the file it sits in)
// becomes an in-app route when it names a registered page. Anything else throws: the pages are shown in the app, and a reader is never sent into the repository.
export function resolveDocLink(href: string, fromFile: string, base: string): ResolvedLink {
  if (href.startsWith("#")) return { kind: "anchor", href };
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return { kind: "external", href };
  const hashAt = href.indexOf("#");
  const path = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  const repoPath = posix.normalize(posix.join("docs", posix.dirname(fromFile), path));
  const page = findDocByFile(repoPath);
  if (page) return { kind: "page", href: `${base}/${page.slug}${hash}`, page, hash };
  throw new Error(`${fromFile} links to ${href}, which is not a registered docs page. Reader pages must not link to repository files.`);
}

// Rewrites inline link destinations in the Markdown source, skipping fenced code. This happens before rendering because the Markdown pipeline
// resolves relative paths itself and may reuse its processors across pages, so neither a plugin nor an `a` override can know the page.
export function rewriteDocLinks(markdown: string, fromFile: string, base: string): string {
  let fence: string | null = null;
  return markdown.split("\n").map((line) => {
    const marker = /^\s*(```+|~~~+)/.exec(line)?.[1];
    if (marker) {
      fence = fence === null ? (marker[0] ?? null) : marker.startsWith(fence) ? null : fence;
      return line;
    }
    return fence === null ? line.replace(/\]\(([^)\s]+)\)/g, (_, href: string) => `](${resolveDocLink(href, fromFile, base).href})`) : line;
  }).join("\n");
}
