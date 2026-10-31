"use client";
import { useMemo } from "react";
import { splitDocument } from "./split";

// The same splitter the server runs, so what the form shows is what gets indexed.
export function BlockPreview({ title, body }: { title: string; body: string }) {
  const result = useMemo(() => /\S/.test(body) ? splitDocument(title, body) : null, [title, body]);
  if (!result) return <p className="text-sm text-muted-foreground">Blocks appear here as you add content. Each heading of the main level becomes a block the agent can read on its own.</p>;
  if (result.kind === "invalid") return <ul role="alert" aria-label="Problems with the content" className="space-y-1 text-sm text-destructive">{result.errors.map((error) => <li key={error.message}>{error.message}</li>)}</ul>;
  return <div aria-label="Blocks" className="rounded-lg border">
    <p className="border-b px-3 py-2 text-xs text-muted-foreground">{result.blocks.length} {result.blocks.length === 1 ? "block" : "blocks"} · {result.blocks.reduce((sum, block) => sum + block.sections.length, 0)} searchable sections</p>
    <ol className="divide-y text-sm">{result.blocks.map((block) => <li key={block.index} className="flex items-baseline justify-between gap-3 px-3 py-2"><span className="min-w-0 truncate"><span className="mr-2 text-muted-foreground tabular-nums">{block.index}</span>{block.heading}</span><span className="shrink-0 text-xs text-muted-foreground tabular-nums">{block.text.length.toLocaleString("en-US")} chars</span></li>)}</ol>
  </div>;
}
