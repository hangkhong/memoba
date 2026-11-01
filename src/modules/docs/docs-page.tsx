import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageBar, PageBody, PageFrame, PageRail } from "@/components/page-frame";
import { DocsArticle } from "./docs-article";
import { DocsContents } from "./docs-nav";
import { docGroups, neighbours, type DocPage, type DocsBasePath } from "./registry";
import type { LoadedDoc } from "./content";

function PagerLink({ page, base, direction }: { page: DocPage; base: DocsBasePath; direction: "previous" | "next" }) {
  const next = direction === "next";
  return <Link href={`${base}/${page.slug}`} rel={direction === "next" ? "next" : "prev"} className={`flex flex-1 flex-col gap-1 rounded-xl border px-4 py-3 text-sm hover:bg-accent ${next ? "items-end text-right" : ""}`}>
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">{!next && <ArrowLeft className="size-3.5"/>}{next ? "Next" : "Previous"}{next && <ArrowRight className="size-3.5"/>}</span>
    <span className="font-medium">{page.title}</span>
  </Link>;
}

// One implementation for /docs and /workspace/docs. `bar` is the only difference: the workspace shows the sidebar trigger, the public site a sign-in link.
export function DocsPage({ doc, base, bar }: { doc: LoadedDoc; base: DocsBasePath; bar: ReactNode }) {
  const { page, markdown, headings } = doc;
  const { previous, next } = neighbours(page.slug);
  const group = docGroups.find((candidate) => candidate.id === page.group);
  return <PageFrame>
    <PageBar>{bar}</PageBar>
    <PageBody>
      <main className="mx-auto w-full min-w-0 max-w-[44rem]">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group?.label} · {group?.summary}</p>
        <details className="mb-6 rounded-xl border min-[1281px]:hidden">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">Contents</summary>
          <div className="border-t p-2"><DocsContents base={base} current={page.slug} headings={headings}/></div>
        </details>
        <DocsArticle markdown={markdown} file={page.file} base={base}/>
        <nav aria-label="Previous and next page" className="mt-12 flex flex-col gap-3 border-t pt-6 sm:flex-row">
          {previous ? <PagerLink page={previous} base={base} direction="previous"/> : <span className="flex-1"/>}
          {next ? <PagerLink page={next} base={base} direction="next"/> : <span className="flex-1"/>}
        </nav>
      </main>
      <div className="hidden min-[1281px]:block"><PageRail label="Docs contents"><DocsContents base={base} current={page.slug} headings={headings}/></PageRail></div>
    </PageBody>
  </PageFrame>;
}
