"use client";
import { isValidElement, type ComponentProps, type ReactNode } from "react";
import { Streamdown, defaultRemarkPlugins, defaultRehypePlugins, useIsCodeFenceIncomplete } from "streamdown";
import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockLine, CodeBlockTitle } from "@/components/ui/code-block";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHighlightedCode } from "@/hooks/use-highlighted-code";
import { cn } from "@/lib/utils";

type StreamdownProps = ComponentProps<typeof Streamdown>;
type Components = NonNullable<StreamdownProps["components"]>;
// Raw HTML is dropped twice: `skipHtml` and no `raw` rehype plugin. Every Markdown view in the product goes through here.
const baseRehypePlugins = Object.entries(defaultRehypePlugins).filter(([name]) => name !== "raw");

type RehypePlugin = NonNullable<StreamdownProps["rehypePlugins"]>[number];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

// The sanitizer drops elements it does not know. A caller that renders its own elements through `components` names them here, with the attributes each may carry.
function rehypePluginsAllowing(tags: Record<string, string[]>) {
  return baseRehypePlugins.map(([name, plugin]): RehypePlugin => {
    const [processor, schema] = Array.isArray(plugin) ? plugin : [];
    if (name !== "sanitize" || !processor || !isRecord(schema)) return plugin;
    const attributes = isRecord(schema.attributes) ? schema.attributes : {};
    return [processor, { ...schema, tagNames: [...strings(schema.tagNames), ...Object.keys(tags)], attributes: { ...attributes, ...tags } }];
  });
}
const rehypePlugins = rehypePluginsAllowing({});

// Streamdown passes the hast `node` to every override; it is not a DOM attribute.
function omitNode<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

function HighlightedLines({ code, language }: { code: string; language: string }) {
  return useHighlightedCode(code, language).map((line, index) => <CodeBlockLine key={index}>{line}</CodeBlockLine>);
}

// Streamdown hands `pre` its `<code>` child, which carries the language class and the source text.
function MarkdownPre({ children }: { children?: ReactNode }) {
  const code = isValidElement<{ className?: string; children?: ReactNode }>(children) ? children.props : undefined;
  const source = typeof code?.children === "string" ? code.children : "";
  const language = /language-(\S+)/.exec(code?.className ?? "")?.[1] ?? "text";
  const incomplete = useIsCodeFenceIncomplete();
  return <CodeBlock className="my-4 border-border bg-muted"><CodeBlockHeader><CodeBlockTitle>{language}</CodeBlockTitle><CodeBlockActions><CodeBlockCopyButton value={source} disabled={incomplete}/></CodeBlockActions></CodeBlockHeader><CodeBlockContent><HighlightedLines code={source} language={language}/></CodeBlockContent></CodeBlock>;
}

// shadcn parts throughout. Code blocks use the app border and muted fill; cells wrap because document tables hold sentences, not short values.
const blockComponents: Components = {
  pre: ({ children }) => <MarkdownPre>{children}</MarkdownPre>,
  table: ({ className, ...props }) => <div className="my-4 overflow-hidden rounded-lg border"><Table className={className} {...omitNode(props)}/></div>,
  thead: (props) => <TableHeader {...omitNode(props)}/>,
  tbody: (props) => <TableBody {...omitNode(props)}/>,
  tr: (props) => <TableRow {...omitNode(props)}/>,
  th: (props) => <TableHead {...omitNode(props)}/>,
  td: ({ className, ...props }) => <TableCell className={cn("whitespace-normal", className)} {...omitNode(props)}/>,
};

export function SafeMarkdown({ extraRemarkPlugins = [], allowedTags, className = "answer-markdown", components, ...props }: Omit<StreamdownProps, "skipHtml" | "controls" | "remarkPlugins" | "rehypePlugins" | "allowedTags"> & { extraRemarkPlugins?: NonNullable<StreamdownProps["remarkPlugins"]>; allowedTags?: Record<string, string[]> }) {
  return <Streamdown skipHtml controls={false} className={className} remarkPlugins={[...Object.values(defaultRemarkPlugins), ...extraRemarkPlugins]} rehypePlugins={allowedTags ? rehypePluginsAllowing(allowedTags) : rehypePlugins} components={{ ...blockComponents, ...components }} {...props}/>;
}
