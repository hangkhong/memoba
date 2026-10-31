import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { StatusDot } from "@/components/badges";
import { PageBar, PageBody, PageFrame } from "@/components/page-frame";
import { DetailRows, RailLayer, RailSection, VersionHistory } from "@/components/rail";
import { documentDetail } from "@/modules/documents/repository";
import { DocumentHeaderActions } from "@/modules/documents/document-actions";
import { DocumentArticle } from "@/modules/documents/document-article";
import { documentTypeLabels, documentTypeMeaning, effectiveLabel } from "@/modules/documents/presentation";
import { documentVersionRows } from "@/modules/documents/revision-history";
import { splitDocument } from "@/modules/documents/split";

export default async function DocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string; version?: string }> }) {
  const context = await requireWorkspace().catch((error: unknown) => { if (error instanceof AccessError && error.status === 401) redirect("/login"); throw error; });
  const id = z.uuid().safeParse((await params).id); if (!id.success) notFound();
  const { edit, version } = await searchParams;
  const detail = await documentDetail(await createServerSupabase(), context, id.data); if (!detail) notFound();
  const current = detail.revisions.find((revision) => revision.id === detail.published_revision_id); if (!current) notFound();
  // An older version opens read only. Members can read every version, as they can read what an old answer cited.
  const requested = version === undefined ? undefined : z.coerce.number().int().positive().safeParse(version);
  if (requested && !requested.success) notFound();
  const shown = requested?.success ? detail.revisions.find((revision) => revision.version === requested.data) : current; if (!shown) notFound();
  const isCurrent = shown.id === current.id;
  const { content } = shown;
  const active = detail.lifecycle === "active";
  const split = splitDocument(content.title, content.body);
  // Content was split when it was published, so a failure here means the splitter changed; show the text rather than nothing.
  const blocks = split.kind === "ok" ? split.blocks : [{ index: 1, heading: content.title, text: content.body }];
  const history = documentVersionRows(detail.revisions, { documentId: detail.id, publishedId: detail.published_revision_id, archived: !active, selectedVersion: shown.version });
  return <PageFrame>
    <PageBar>
      <SidebarTrigger className="-ml-1 text-muted-foreground md:hidden"/>
      <Link href="/workspace/knowledge?tab=documents" aria-label="Back to Knowledge Hub documents" className={buttonVariants({ variant: "ghost", size: "icon", className: "text-muted-foreground" })}><ChevronLeft aria-hidden="true"/></Link>
      <h1 title={content.title} className="min-w-0 flex-1 truncate text-sm font-medium">{content.title}</h1>
      {active && isCurrent && <DocumentHeaderActions documentId={detail.id} title={content.title} initial={content} defaultEdit={edit === "1"}/>}
    </PageBar>
    <PageBody>
      <main className="min-w-0 max-w-[42.5rem] min-[1281px]:mx-auto min-[1281px]:w-full">{!isCurrent && <div role="note" className="mb-6 rounded-lg border bg-muted/40 px-4 py-3 text-sm">You are reading version {shown.version}, an earlier version that is read only. <Link className="text-[var(--evidence-accent)] underline underline-offset-4" href={`/workspace/knowledge/documents/${detail.id}`}>Open the current version ({current.version})</Link></div>}<p className="mb-8 text-lg leading-8 text-muted-foreground">{content.description}</p><DocumentArticle blocks={blocks}/></main>
      <aside aria-label="Document details" className="flex min-w-0 flex-col gap-3 text-sm">
        <RailLayer label="Details">
          <RailSection title="Details">
            <DetailRows rows={[{ label: "Version", value: <>Version {shown.version}{isCurrent ? "" : " (earlier)"}</> }, { label: "Type", value: <span title={documentTypeMeaning[content.type]}>{documentTypeLabels[content.type]} · {documentTypeMeaning[content.type]}</span> }, { label: "Area", value: content.area }, { label: "Owner", value: content.owner }, { label: "Effective", value: effectiveLabel(content.effectiveFrom) }, { label: "Status", value: <StatusDot status={active ? "available" : "archived"}/> }]}/>
          </RailSection>
          {content.sources.length > 0 && <RailSection title="Sources"><ul className="space-y-1.5">{content.sources.map((source) => <li key={source.url}><a className="text-[var(--evidence-accent)] underline underline-offset-4 break-words" href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul></RailSection>}
          <RailSection title="Contents"><ol className="space-y-1.5">{blocks.map((block) => <li key={block.index}><a className="text-[var(--evidence-accent)] underline underline-offset-4" href={`#block-${block.index}`}>{block.heading}</a></li>)}</ol></RailSection>
        </RailLayer>
        <RailLayer label="Version history"><RailSection title="Version history"><VersionHistory rows={history}/></RailSection></RailLayer>
      </aside>
    </PageBody>
  </PageFrame>;
}
