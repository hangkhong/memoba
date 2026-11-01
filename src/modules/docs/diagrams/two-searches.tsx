"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Choice, DiagramFrame, Mark, eyebrow } from "./parts";

type Hit = { id: string; title: string; section: string; nearby?: boolean };
type Example = { id: string; text: string; keyword: readonly Hit[]; meaning: readonly Hit[]; keywordEmpty?: string };

const sync: Hit = { id: "sync", title: "NetSuite sync dropped invoices", section: "Problem" };
const cutover: Hit = { id: "cutover", title: "NetSuite vendor cutover", section: "Context" };
const billing: Hit = { id: "billing", title: "Moving to a new billing provider", section: "Approach" };
const close: Hit = { id: "close", title: "Month-end close slipped", section: "Outcome" };
const staged: Hit = { id: "staged", title: "Staged rollout of the new plan", section: "Approach" };
const beta: Hit = { id: "beta", title: "Beta group before general release", section: "Approach" };
const newsletter: Hit = { id: "newsletter", title: "Quarterly customer newsletter", section: "Context", nearby: true };

export const examples: readonly Example[] = [
  { id: "name", text: "An exact name", keyword: [sync, cutover], meaning: [billing, sync, close] },
  { id: "words", text: "Different words", keyword: [], keywordEmpty: "No section contains all of these words.", meaning: [staged, beta, newsletter] },
];
export const questions: Record<string, string> = { name: "What went wrong with the NetSuite invoice sync?", words: "How did we release it slowly to customers?" };

// A section earns more for sitting near the top of either list, and the most for sitting near the top of both. The constant matches search_knowledge.
export function combine(keyword: readonly Hit[], meaning: readonly Hit[]) {
  const score = new Map<string, number>();
  const add = (hits: readonly Hit[]) => hits.forEach((hit, index) => score.set(hit.id, (score.get(hit.id) ?? 0) + 1 / (50 + index + 1)));
  add(keyword); add(meaning);
  const all = new Map([...keyword, ...meaning].map((hit) => [hit.id, hit]));
  return [...all.values()].sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0)).map((hit) => ({ hit, in: [keyword.some((k) => k.id === hit.id) && "keyword", meaning.some((m) => m.id === hit.id) && "meaning"].filter(Boolean) as ("keyword" | "meaning")[] }));
}

function Row({ hit, rank, tag, strong }: { hit: Hit; rank: number; tag?: string; strong?: boolean }) {
  return <div className={cn("flex items-start gap-2 rounded-md border bg-background p-2", strong && "border-chart-1 bg-chart-1/10")}>
    <span className="w-4 shrink-0 text-xs text-muted-foreground tabular-nums">{rank}</span>
    <Mark kind="case" className="mt-0.5"/>
    <div className="min-w-0 flex-1"><div className="font-medium">{hit.title}</div>
      <div className="text-xs text-muted-foreground">{hit.section}{hit.nearby ? " · nearby, not relevant" : ""}</div>
      {tag ? <div className="mt-1 text-xs font-semibold">{tag}</div> : null}</div>
  </div>;
}

function Column({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-2"><div><div className="font-semibold">{title}</div><div className="text-xs text-muted-foreground">{hint}</div></div>{children}</div>;
}

// Takeaway: each search finds what the other misses, and a section near the top of both lists comes first.
export function TwoSearches() {
  const [id, setId] = useState("name");
  const example = examples.find((candidate) => candidate.id === id) ?? examples[0]!;
  const merged = combine(example.keyword, example.meaning);
  return <DiagramFrame label="One question run through keyword search and search by meaning, then combined. Choose an example question to see what each search finds and misses." note="Illustrative: the cases, sections, and ranks are made up to show the effect. Real searches also cover documents, in a separate search.">
    <div className="flex flex-col gap-3">
      <Choice label="The question uses" options={examples.map((e) => ({ id: e.id, text: e.text }))} value={id} onChange={setId}/>
      <div className="rounded-md border bg-background p-2"><span className={eyebrow}>Question </span><span className="font-medium">{questions[id]}</span></div>
      <div className="grid gap-4 @xl:grid-cols-3" aria-live="polite">
        <Column title="Keyword search" hint="Matches the words themselves">
          {example.keyword.length ? example.keyword.map((hit, i) => <Row key={hit.id} hit={hit} rank={i + 1}/>) : <div className="rounded-md border border-dashed p-2 text-muted-foreground">{example.keywordEmpty}</div>}
        </Column>
        <Column title="Search by meaning" hint="Finds similar ideas, always something nearby">
          {example.meaning.map((hit, i) => <Row key={hit.id} hit={hit} rank={i + 1}/>)}
        </Column>
        <Column title="Combined list" hint="By position in each list">
          {merged.map(({ hit, in: found }, i) => <Row key={hit.id} hit={hit} rank={i + 1} strong={found.length === 2} tag={found.length === 2 ? "Near the top of both lists" : found[0] === "keyword" ? "Found by keyword only" : "Found by meaning only"}/>)}
        </Column>
      </div>
    </div>
  </DiagramFrame>;
}
