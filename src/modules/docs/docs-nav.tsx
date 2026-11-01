import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DocHeading } from "./headings";
import { docGroups, docPages, type DocsBasePath } from "./registry";

// Every page in reading order under Why and How, the current one marked, then the current page's own headings.
export function DocsContents({ base, current, headings }: { base: DocsBasePath; current: string; headings: DocHeading[] }) {
  return <nav aria-label="Docs contents" className="flex flex-col gap-5 text-sm">
    {docGroups.map((group) => <div key={group.id}>
      <p className="mb-1.5 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.label}</p>
      <ol className="flex flex-col">{docPages.filter((page) => page.group === group.id).map((page) => {
        const active = page.slug === current;
        return <li key={page.slug}><Link href={`${base}/${page.slug}`} aria-current={active ? "page" : undefined} className={cn("block rounded-md px-2 py-1.5 leading-snug hover:bg-accent", active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}>{page.title}</Link></li>;
      })}</ol>
    </div>)}
    {headings.length > 0 && <div>
      <p className="mb-1.5 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">On this page</p>
      <ul className="flex flex-col border-l">{headings.map((heading) => <li key={heading.id}><a href={`#${heading.id}`} className={cn("-ml-px block border-l border-transparent py-1 pr-2 leading-snug text-muted-foreground hover:border-foreground hover:text-foreground", heading.depth === 3 ? "pl-6" : "pl-3")}>{heading.text}</a></li>)}</ul>
    </div>}
  </nav>;
}
