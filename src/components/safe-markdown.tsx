"use client";
import type { ComponentProps } from "react";
import { Streamdown, defaultRemarkPlugins, defaultRehypePlugins } from "streamdown";

type StreamdownProps = ComponentProps<typeof Streamdown>;
// Raw HTML is dropped twice: `skipHtml` and no `raw` rehype plugin. Every Markdown view in the product goes through here.
const rehypePlugins = Object.entries(defaultRehypePlugins).filter(([name]) => name !== "raw").map(([, plugin]) => plugin);

export function SafeMarkdown({ extraRemarkPlugins = [], className = "answer-markdown", ...props }: Omit<StreamdownProps, "skipHtml" | "controls" | "remarkPlugins" | "rehypePlugins"> & { extraRemarkPlugins?: NonNullable<StreamdownProps["remarkPlugins"]> }) {
  return <Streamdown skipHtml controls={false} className={className} remarkPlugins={[...Object.values(defaultRemarkPlugins), ...extraRemarkPlugins]} rehypePlugins={rehypePlugins} {...props}/>;
}
