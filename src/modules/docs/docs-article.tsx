"use client";
import { useMemo, type ComponentProps } from "react";
import Link from "next/link";
import { SafeMarkdown } from "@/components/safe-markdown";
import { docDiagrams } from "./diagrams";
import { rewriteDocLinks } from "./links";
import { docsRemarkPlugin } from "./remark-docs";

type Anchor = ComponentProps<"a"> & { node?: unknown };

// The Markdown pipeline hands every link its hast `node` and target="_blank"; links inside the docs stay in the tab, so those are dropped for them.
function DocLink({ href, children, ...props }: Anchor) {
  const rest = { ...props };
  delete rest.node;
  delete rest.target;
  delete rest.rel;
  if (href?.startsWith("/")) return <Link href={href} {...rest}>{children}</Link>;
  if (href?.startsWith("#")) return <a href={href} {...rest}>{children}</a>;
  return <a href={href} {...rest} target="_blank" rel="noopener noreferrer">{children}</a>;
}

function DiagramSlot({ name }: Record<string, unknown>) {
  const Diagram = typeof name === "string" ? docDiagrams[name] : undefined;
  return Diagram ? <figure className="my-6"><Diagram/></figure> : null;
}

const remarkPlugin = docsRemarkPlugin();
const components = { a: DocLink, "docs-diagram": DiagramSlot };

// Client-side because the remark plugin and component overrides are functions, which cannot cross from a server component.
export function DocsArticle({ markdown, file, base }: { markdown: string; file: string; base: string }) {
  const source = useMemo(() => rewriteDocLinks(markdown, file, base), [markdown, file, base]);
  return <SafeMarkdown mode="static" className="answer-markdown docs-article" extraRemarkPlugins={[remarkPlugin]} components={components} linkSafety={{ enabled: false }}>{source}</SafeMarkdown>;
}
