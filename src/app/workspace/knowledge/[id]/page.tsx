import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LinkForm } from "@/modules/cases/link-form";
import { caseDetail, listCases } from "@/modules/cases/repository";
import { listConcepts } from "@/modules/cases/queries";
import { caseStatus, publicationLabel, relationLabels } from "@/modules/cases/presentation";
import { OutcomePill, StatusDot, TemplateChip } from "@/modules/cases/case-badges";
import { CaseHeaderActions, ReindexButton } from "@/modules/cases/case-detail-actions";
import { CaseArticle } from "@/modules/cases/case-article";
import { CasePageBar, CasePageBody, CasePageFrame } from "@/modules/cases/case-page-frame";
import { DetailRows, RailLayer, RailSection, TagList, VersionHistory } from "@/modules/cases/case-rail";
import { versionRows } from "@/modules/cases/revision-history";

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const context = await requireWorkspace().catch((error: unknown) => { if (error instanceof AccessError && error.status === 401) redirect("/login"); throw error; });
  const id = z.uuid().safeParse((await params).id); if (!id.success) notFound();
  const { edit } = await searchParams;
  const supabase = await createServerSupabase();
  const detail = await caseDetail(supabase, context, id.data); if (!detail) notFound();
  const latest = detail.revisions.find((revision) => revision.id === detail.latest_revision_id); if (!latest) notFound();
  const [all, concepts] = await Promise.all([listCases(supabase, context), listConcepts(context)]);
  const titles = new Map(all.map((item) => [item.id, item.revision?.content.title ?? "Case"]));
  const links = detail.links.map((link) => { const outgoing = link.source_id === detail.id; const other = outgoing ? link.target_id : link.source_id; return { key: `${link.source_id}:${link.target_id}:${link.relation_type}`, other, title: titles.get(other) ?? "Case", label: relationLabels[link.relation_type][outgoing ? "outgoing" : "incoming"], reason: link.reason }; });
  const linked = new Set(links.map((link) => link.other));
  const candidates = all.filter((item) => item.id !== detail.id && item.lifecycle === "active" && !linked.has(item.id)).map((item) => ({ id: item.id, title: titles.get(item.id) ?? "Case" }));
  const { content } = latest;
  const state = { lifecycle: detail.lifecycle, indexState: latest.index_state, pendingUpdate: latest.id !== detail.published_revision_id, published: !!detail.published_revision_id };
  const status = caseStatus(state); const active = detail.lifecycle === "active";
  const tags = content.conceptIds.flatMap((conceptId) => concepts.find((concept) => concept.id === conceptId)?.label ?? []);
  const history = versionRows(detail.revisions, { publishedId: detail.published_revision_id, archived: !active });
  return <CasePageFrame>
    <CasePageBar>
      <SidebarTrigger className="-ml-1 text-muted-foreground md:hidden"/>
      <Link href="/workspace/knowledge" aria-label="Back to Knowledge Hub" className={buttonVariants({ variant: "ghost", size: "icon", className: "text-muted-foreground" })}><ChevronLeft aria-hidden="true"/></Link>
      <h1 title={content.title} className="min-w-0 flex-1 truncate text-sm font-medium">{content.title}</h1>
      {active && <CaseHeaderActions caseId={detail.id} title={content.title} initial={content} concepts={concepts} defaultEdit={edit === "1"}/>}
    </CasePageBar>
    <CasePageBody>
      <main className="min-w-0 max-w-[42.5rem] min-[1281px]:mx-auto min-[1281px]:w-full"><CaseArticle content={content}/></main>
      <aside aria-label="Case details" className="flex min-w-0 flex-col gap-3 text-sm">
        <RailLayer label="Details">
          <RailSection title="Details">
            <DetailRows rows={[{ label: "Template", value: <TemplateChip template={content.template}/> }, { label: "Outcome", value: <OutcomePill outcome={content.outcome}/> }, { label: "Status", value: <StatusDot status={status}/> }, ...(tags.length > 0 ? [{ label: "Concepts", value: <TagList labels={tags}/> }] : [])]}/>
            {status !== "available" && status !== "archived" && <p className={`mt-3 text-xs leading-5 ${status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>{publicationLabel(state)}</p>}
            {active && latest.index_state !== "ready" && <ReindexButton caseId={detail.id} revisionId={latest.id}/>}
          </RailSection>
          {content.sources.length > 0 && <RailSection title="Sources"><ul className="space-y-1.5">{content.sources.map((source) => <li key={source.url}><a className="text-[var(--evidence-accent)] underline underline-offset-4 break-words" href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul></RailSection>}
          <RailSection title="Related cases">
            {links.length === 0 ? <p className="text-muted-foreground">No related cases yet.</p> : <ul className="space-y-3">{links.map((link) => <li key={link.key}><Link className="font-medium underline-offset-4 hover:underline" href={`/workspace/knowledge/${link.other}`}>{link.title}</Link><p className="text-xs text-muted-foreground">{link.label} · {link.reason}</p></li>)}</ul>}
            {active && <LinkForm caseId={detail.id} cases={candidates}/>}
          </RailSection>
        </RailLayer>
        <RailLayer label="Version history"><RailSection title="Version history"><VersionHistory rows={history}/></RailSection></RailLayer>
      </aside>
    </CasePageBody>
  </CasePageFrame>;
}
