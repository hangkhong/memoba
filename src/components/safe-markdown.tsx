"use client";
import { isValidElement, type ComponentProps, type ReactNode } from "react";
import { Streamdown, defaultRemarkPlugins, defaultRehypePlugins } from "streamdown";
import { CodeBlock, CodeBlockContent, CodeBlockLine } from "@/components/ui/code-block";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHighlightedCode } from "@/hooks/use-highlighted-code";
import { cn } from "@/lib/utils";

type StreamdownProps = ComponentProps<typeof Streamdown>;
type Components = NonNullable<StreamdownProps["components"]>;
// Raw HTML is dropped twice: `skipHtml` and no `raw` rehype plugin. Every Markdown view in the product goes through here.
const rehypePlugins = Object.entries(defaultRehypePlugins).filter(([name]) => name !== "raw").map(([, plugin]) => plugin);

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
  return <CodeBlock className="my-4 rounded-none border-0 in-[.evidence-markdown]:text-xs dark:bg-transparent"><CodeBlockContent className="px-0"><HighlightedLines code={source} language={language}/></CodeBlockContent></CodeBlock>;
}

// Tables and code sit directly on the page: no wrapper box, border or fill, only horizontal scroll when they are wider than the column.
const blockComponents: Components = {
  pre: ({ children }) => <MarkdownPre>{children}</MarkdownPre>,
  table: ({ className, ...props }) => <div className="my-4"><Table className={cn("in-[.evidence-markdown]:text-xs", className)} {...omitNode(props)}/></div>,
  thead: (props) => <TableHeader {...omitNode(props)}/>,
  tbody: (props) => <TableBody {...omitNode(props)}/>,
  tr: ({ className, ...props }) => <TableRow className={cn("hover:bg-transparent", className)} {...omitNode(props)}/>,
  th: ({ className, ...props }) => <TableHead className={cn("h-auto px-3 py-2 font-semibold in-[.evidence-markdown]:px-2 in-[.evidence-markdown]:py-1.5", className)} {...omitNode(props)}/>,
  td: ({ className, ...props }) => <TableCell className={cn("px-3 py-2 whitespace-normal in-[.evidence-markdown]:px-2 in-[.evidence-markdown]:py-1.5", className)} {...omitNode(props)}/>,
};

export function SafeMarkdown({ extraRemarkPlugins = [], className = "answer-markdown", components, ...props }: Omit<StreamdownProps, "skipHtml" | "controls" | "remarkPlugins" | "rehypePlugins"> & { extraRemarkPlugins?: NonNullable<StreamdownProps["remarkPlugins"]> }) {
  return <Streamdown skipHtml controls={false} className={className} remarkPlugins={[...Object.values(defaultRemarkPlugins), ...extraRemarkPlugins]} rehypePlugins={rehypePlugins} components={{ ...blockComponents, ...components }} {...props}/>;
}
