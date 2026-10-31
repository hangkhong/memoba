"use client";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RailLayer } from "@/components/rail";

// The block list in the rail. It collapses from its header; the sections in the article stay as they are.
export function DocumentContents({ blocks }: { blocks: { index: number; heading: string }[] }) {
  return <RailLayer label="Content"><Collapsible defaultOpen className="px-4 py-3.5">
    <h2 className="text-sm font-medium"><CollapsibleTrigger className="group/trigger flex min-h-6 w-full cursor-pointer items-center justify-between gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Content<ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-180"/></CollapsibleTrigger></h2>
    <CollapsibleContent><ol className="mt-2 -mx-1.5 text-sm">{blocks.map((block) => <li key={block.index}><a className="block rounded-md px-1.5 py-1 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground" href={`#block-${block.index}`}>{block.heading}</a></li>)}</ol></CollapsibleContent>
  </Collapsible></RailLayer>;
}
