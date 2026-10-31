"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OptionSelect, type Option } from "@/components/option-select";
import { StatusDot } from "@/components/badges";
import { cn } from "cn";
import type { DocumentRow } from "./document-rows";
import { documentAreas, documentTypeLabels, effectiveLabel } from "./presentation";

const typeOptions: Option<string>[] = [{ value: "all", label: "All types" }, ...Object.entries(documentTypeLabels).map(([value, label]) => ({ value, label }))];
const areaOptions: Option<string>[] = [{ value: "all", label: "All areas" }, ...documentAreas.map((value) => ({ value, label: value }))];
const head = "h-9 px-3 text-xs font-normal text-muted-foreground";

export function DocumentLibrary({ rows }: { rows: DocumentRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState(""); const [type, setType] = useState("all"); const [area, setArea] = useState("all"); const [archived, setArchived] = useState(false);
  const pool = rows.filter((item) => archived || item.lifecycle === "active");
  const visible = pool.filter((item) => (type === "all" || item.type === type) && (area === "all" || item.area === area) && `${item.title} ${item.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const filtered = visible.length !== pool.length;
  const message = !rows.length ? "No documents yet. Use Add document to add the first one." : "No documents match these filters.";
  return <section className="mt-8" aria-label="Documents">
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-48 flex-1"><Label htmlFor="document-search" className="sr-only">Search documents</Label><Search className="pointer-events-none absolute top-2 left-3 size-4 text-muted-foreground"/><Input id="document-search" placeholder="Search documents…" className="bg-background pl-9" value={query} onChange={(event) => setQuery(event.target.value)}/></div>
      <div><Label htmlFor="document-type-filter" className="sr-only">Type</Label><OptionSelect id="document-type-filter" items={typeOptions} value={type} onValueChange={setType} className="w-40"/></div>
      <div><Label htmlFor="document-area-filter" className="sr-only">Area</Label><OptionSelect id="document-area-filter" items={areaOptions} value={area} onValueChange={setArea} className="w-40"/></div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox id="document-include-archived" checked={archived} onCheckedChange={setArchived}/><Label htmlFor="document-include-archived" className="font-normal">Include archived</Label></div>
    </div>
    <p role="status" className="mt-6 mb-2 text-sm text-muted-foreground tabular-nums">{filtered ? `${visible.length} of ${pool.length}` : pool.length} {pool.length === 1 ? "document" : "documents"}</p>
    <Table className="border-t">
      <TableHeader><TableRow className="hover:bg-transparent"><TableHead className={head}>Document</TableHead><TableHead className={head}>Type</TableHead><TableHead className={cn(head, "hidden md:table-cell")}>Area</TableHead><TableHead className={cn(head, "hidden lg:table-cell")}>Owner</TableHead><TableHead className={cn(head, "hidden md:table-cell")}>Effective</TableHead><TableHead className={cn(head, "hidden md:table-cell")}>Status</TableHead></TableRow></TableHeader>
      <TableBody>{visible.length === 0 ? <TableRow className="hover:bg-transparent"><TableCell colSpan={2} className="h-32 px-3 text-center text-sm text-muted-foreground">{message}</TableCell></TableRow> : visible.map((item) => <TableRow key={item.id} className="cursor-pointer" onClick={(event) => { if (!(event.target instanceof Element && event.target.closest("a,button"))) router.push(`/workspace/knowledge/documents/${item.id}`); }}>
        <TableCell className="px-3 py-3.5 whitespace-normal"><div className="w-[min(24rem,60vw)]"><Link prefetch={false} className="font-medium text-foreground underline-offset-4 hover:underline" href={`/workspace/knowledge/documents/${item.id}`}>{item.title}</Link><p className="mt-0.5 truncate text-muted-foreground">{item.description}</p></div></TableCell>
        <TableCell className="px-3"><span className="inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">{documentTypeLabels[item.type]}</span></TableCell>
        <TableCell className="hidden px-3 md:table-cell">{item.area}</TableCell>
        <TableCell className="hidden px-3 text-muted-foreground lg:table-cell">{item.owner}</TableCell>
        <TableCell className="hidden px-3 text-muted-foreground tabular-nums md:table-cell">{effectiveLabel(item.effectiveFrom)}</TableCell>
        <TableCell className="hidden px-3 md:table-cell"><StatusDot status={item.status}/></TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </section>;
}
