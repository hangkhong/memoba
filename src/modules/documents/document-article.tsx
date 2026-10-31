"use client";
import { SafeMarkdown } from "@/components/safe-markdown";

// One section per block with a stable anchor, so evidence links and the contents list can point at it.
export function DocumentArticle({ blocks }: { blocks: { index: number; heading: string; text: string }[] }) {
  return <article className="flex flex-col gap-8 [&_.answer-markdown]:text-[15px] [&_.answer-markdown]:leading-[26px]">{blocks.map((block) => <section key={block.index} id={`block-${block.index}`} aria-label={block.heading} className="scroll-mt-20 target:rounded-md target:bg-muted/40">
    <SafeMarkdown mode="static">{block.text}</SafeMarkdown>
  </section>)}</article>;
}
