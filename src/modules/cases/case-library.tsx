"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OptionSelect, type Option } from "@/components/option-select";
import { cn } from "cn";
import { OutcomePill, StatusDot, Tag, TemplateChip } from "./case-badges";
import type { CaseRow } from "./case-rows";
import { outcomeLabels, templateLabels } from "./presentation";
import { RelativeDate } from "./relative-date";

const templateOptions: Option<string>[] = [{ value: "all", label: "All templates" }, ...Object.entries(templateLabels).map(([value, label]) => ({ value, label }))];
const outcomeOptions: Option<string>[] = [{ value: "all", label: "All outcomes" }, ...Object.entries(outcomeLabels).map(([value, label]) => ({ value, label }))];
type SortKey = "title" | "updated";
type Sort = { key: SortKey; direction: "asc" | "desc" };
const head = "h-9 px-3 text-xs font-normal text-muted-foreground";

function SortHead({ label, sortKey, sort, onSort, className }: { label: string; sortKey: SortKey; sort: Sort; onSort: (key: SortKey) => void; className?: string }) {
  const active = sort.key === sortKey;
  return <TableHead className={cn(head, className)} aria-sort={active ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" onClick={() => onSort(sortKey)} className={cn("inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none", active && "text-foreground")}>{label}{active && (sort.direction === "asc" ? <ArrowUp className="size-3" aria-hidden="true"/> : <ArrowDown className="size-3" aria-hidden="true"/>)}</button></TableHead>;
}

export function CaseLibrary({ rows }: { rows: CaseRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState(""); const [template, setTemplate] = useState("all"); const [outcome, setOutcome] = useState("all"); const [archived, setArchived] = useState(false);
  const [sort, setSort] = useState<Sort>({ key: "updated", direction: "desc" });
  const pool = rows.filter((item) => archived || item.lifecycle === "active");
  const visible = pool.filter((item) => (template === "all" || item.template === template) && (outcome === "all" || item.outcome === outcome) && `${item.title} ${item.problem}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .toSorted((a, b) => (sort.key === "title" ? a.title.localeCompare(b.title) : a.updatedAt.localeCompare(b.updatedAt)) * (sort.direction === "asc" ? 1 : -1));
  const filtered = visible.length !== pool.length;
  function changeSort(key: SortKey) { setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: key === "title" ? "asc" : "desc" }); }
  const message = !rows.length ? "No cases yet. Use Record a case to add the first one." : "No cases match these filters.";
  return <section className="mt-8" aria-label="Cases">
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-48 flex-1"><Label htmlFor="case-search" className="sr-only">Search cases</Label><Search className="pointer-events-none absolute top-2 left-3 size-4 text-muted-foreground"/><Input id="case-search" placeholder="Search cases…" className="bg-background pl-9" value={query} onChange={(event) => setQuery(event.target.value)}/></div>
      <div><Label htmlFor="template-filter" className="sr-only">Template</Label><OptionSelect id="template-filter" items={templateOptions} value={template} onValueChange={setTemplate} className="w-44"/></div>
      <div><Label htmlFor="outcome-filter" className="sr-only">Outcome</Label><OptionSelect id="outcome-filter" items={outcomeOptions} value={outcome} onValueChange={setOutcome} className="w-40"/></div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox id="include-archived" checked={archived} onCheckedChange={setArchived}/><Label htmlFor="include-archived" className="font-normal">Include archived</Label></div>
    </div>
    <p role="status" className="mt-6 mb-2 text-sm text-muted-foreground tabular-nums">{filtered ? `${visible.length} of ${pool.length}` : pool.length} {pool.length === 1 ? "case" : "cases"}</p>
    <Table className="border-t">
      <TableHeader><TableRow className="hover:bg-transparent"><SortHead label="Case" sortKey="title" sort={sort} onSort={changeSort}/><TableHead className={cn(head, "hidden lg:table-cell")}>Concepts</TableHead><TableHead className={cn(head, "hidden md:table-cell")}>Template</TableHead><TableHead className={head}>Outcome</TableHead><TableHead className={cn(head, "hidden md:table-cell")}>Status</TableHead><SortHead label="Updated" sortKey="updated" sort={sort} onSort={changeSort} className="hidden text-right md:table-cell [&>button]:ml-auto [&>button]:flex-row-reverse"/></TableRow></TableHeader>
      <TableBody>{visible.length === 0 ? <TableRow className="hover:bg-transparent"><TableCell colSpan={2} className="h-32 px-3 text-center text-sm text-muted-foreground">{message}</TableCell></TableRow> : visible.map((item) => <TableRow key={item.id} className="cursor-pointer" onClick={(event) => { if (!(event.target instanceof Element && event.target.closest("a,button"))) router.push(`/workspace/knowledge/${item.id}`); }}>
        <TableCell className="px-3 py-3.5 whitespace-normal"><div className="w-[min(24rem,60vw)]"><Link prefetch={false} className="font-medium text-foreground underline-offset-4 hover:underline" href={`/workspace/knowledge/${item.id}`}>{item.title}</Link><p className="mt-0.5 truncate text-muted-foreground">{item.problem}</p></div></TableCell>
        <TableCell className="hidden px-3 lg:table-cell"><div className="flex gap-1">{item.concepts.slice(0, 2).map((label) => <Tag key={label}>{label}</Tag>)}{item.concepts.length > 2 && <Tag>+{item.concepts.length - 2}</Tag>}</div></TableCell>
        <TableCell className="hidden px-3 md:table-cell"><TemplateChip template={item.template}/></TableCell>
        <TableCell className="px-3"><OutcomePill outcome={item.outcome}/></TableCell>
        <TableCell className="hidden px-3 md:table-cell"><StatusDot status={item.status}/></TableCell>
        <TableCell className="hidden px-3 text-right text-muted-foreground tabular-nums md:table-cell"><RelativeDate iso={item.updatedAt}/></TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </section>;
}
