import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { LinkForm } from "@/modules/cases/link-form";
import { caseDetail, listCases } from "@/modules/cases/repository";
import { listConcepts } from "@/modules/cases/queries";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { caseStatus, publicationLabel, sectionLabels, templateFields, templateLabels } from "@/modules/cases/presentation";
import { OutcomePill, StatusDot, Tag, TemplateChip } from "@/modules/cases/case-badges";
import { CaseHeaderActions, ReindexButton } from "@/modules/cases/case-detail-actions";
import { RelativeDate } from "@/modules/cases/relative-date";
import { ChevronRight } from "lucide-react";

const relationLabels: Record<string, string> = { related_to: "Related to", contrasts_with: "Contrasts with", supersedes: "Supersedes" };
function Block({ title, children }: { title: string; children: string }) { return <section><h2 className="text-sm font-semibold">{title}</h2><p className="mt-2 text-base leading-7 whitespace-pre-wrap">{children}</p></section>; }
function Rail({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className="mb-2 text-xs text-muted-foreground">{title}</h2>{children}</section>; }

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const context = await requireWorkspace().catch((error: unknown) => { if (error instanceof AccessError && error.status === 401) redirect("/login"); throw error; });
  const id = z.uuid().safeParse((await params).id); if (!id.success) notFound();
  const { edit } = await searchParams;
  const supabase = await createServerSupabase();
  const detail = await caseDetail(supabase, context, id.data); if (!detail) notFound();
  const latest = detail.revisions.find((revision) => revision.id === detail.latest_revision_id); if (!latest) notFound();
  const [all, concepts] = await Promise.all([listCases(supabase, context), listConcepts(context)]);
  const titles = new Map(all.map((item) => [item.id, item.revision?.content.title ?? "Case"]));
  const candidates = all.filter((item) => item.id !== detail.id && item.lifecycle === "active").map((item) => ({ id: item.id, title: titles.get(item.id) ?? "Case" }));
  const { content } = latest;
  const state = { lifecycle: detail.lifecycle, indexState: latest.index_state, pendingUpdate: latest.id !== detail.published_revision_id, published: !!detail.published_revision_id };
  const status = caseStatus(state); const active = detail.lifecycle === "active";
  const tags = content.conceptIds.flatMap((conceptId) => concepts.find((concept) => concept.id === conceptId)?.label ?? []);
  const extra = templateFields[content.template].flatMap((key) => { const text = (content as Record<string, unknown>)[key]; return typeof text === "string" && /\S/.test(text) ? [{ key, text }] : []; });
  return <div className="workspace-page">
    <Link className="back-link" href="/workspace/knowledge">← Knowledge Hub</Link>
    <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
      <main className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h1 className="page-title">{content.title}</h1><p className="mt-2 text-sm text-muted-foreground">{templateLabels[content.template]} · Updated <RelativeDate iso={latest.created_at}/></p></div>{active && <CaseHeaderActions caseId={detail.id} title={content.title} initial={content} concepts={concepts} defaultEdit={edit === "1"}/>}</div>
        <section className="mt-8"><h2 className="text-sm font-semibold">Problem</h2><p className="mt-2 text-lg leading-8 whitespace-pre-wrap">{content.problem}</p></section>
        <div className={`mt-8 grid gap-8 ${content.constraints.trim() ? "md:grid-cols-2" : ""}`}><Block title={sectionLabels.context}>{content.context}</Block>{content.constraints.trim() && <Block title={sectionLabels.constraints}>{content.constraints}</Block>}</div>
        <div className="mt-8"><Block title={sectionLabels.approach}>{content.approach}</Block></div>
        <section className="mt-8 rounded-lg border p-5"><div className="flex flex-wrap items-center gap-3"><h2 className="text-sm font-semibold">Outcome</h2><OutcomePill outcome={content.outcome}/></div><p className="mt-3 text-base leading-7 whitespace-pre-wrap">{content.observedOutcome.trim() || "No observed outcome recorded yet."}</p></section>
        {content.lessons.trim() && <div className="mt-8"><Block title={sectionLabels.lessons}>{content.lessons}</Block></div>}
        {extra.length > 0 && <section className="mt-8 border-t pt-6"><h2 className="text-sm font-semibold">{content.template === "product_delivery" ? "Delivery conditions" : "Customer and operations"}</h2><dl className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">{extra.map((item) => <div key={item.key}><dt className="text-xs text-muted-foreground">{sectionLabels[item.key]}</dt><dd className="mt-1 text-sm leading-6 whitespace-pre-wrap">{item.text}</dd></div>)}</dl></section>}
      </main>
      <aside aria-label="Case details" className="min-w-0 space-y-7 text-sm lg:border-l lg:pl-8">
        <Rail title="Details"><dl className="grid grid-cols-[5.5rem_1fr] items-center gap-y-3"><dt className="text-muted-foreground">Template</dt><dd><TemplateChip template={content.template}/></dd><dt className="text-muted-foreground">Outcome</dt><dd><OutcomePill outcome={content.outcome}/></dd><dt className="text-muted-foreground">Status</dt><dd><StatusDot status={status}/></dd></dl>
          {status !== "available" && status !== "archived" && <p className={`mt-3 text-xs leading-5 ${status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>{publicationLabel(state)}</p>}
          {status === "updating" && <p className="mt-1 text-xs leading-5 text-muted-foreground">This update is not published. Questions continue to use the previous published revision.</p>}
          {active && latest.index_state !== "ready" && <ReindexButton caseId={detail.id} revisionId={latest.id}/>}</Rail>
        {tags.length > 0 && <Rail title="Concepts"><div className="flex flex-wrap gap-1.5">{tags.map((label) => <Tag key={label}>{label}</Tag>)}</div></Rail>}
        {content.sources.length > 0 && <Rail title="Sources"><ul className="space-y-1.5">{content.sources.map((source) => <li key={source.url}><a className="text-[var(--evidence-accent)] underline underline-offset-4 break-words" href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul></Rail>}
        <Rail title="Related cases">
          {detail.links.length === 0 ? <p className="text-muted-foreground">No linked cases yet.</p> : <ul className="space-y-3">{detail.links.map((link) => { const other = link.source_id === detail.id ? link.target_id : link.source_id; return <li key={`${link.source_id}:${link.target_id}:${link.relation_type}`}><Link className="font-medium underline-offset-4 hover:underline" href={`/workspace/knowledge/${other}`}>{titles.get(other) ?? "Case"}</Link><p className="text-xs text-muted-foreground">{relationLabels[link.relation_type] ?? link.relation_type.replaceAll("_", " ")} · {link.reason}</p></li>; })}</ul>}
          {active && <LinkForm caseId={detail.id} cases={candidates}/>}
        </Rail>
        <Collapsible className="border-t pt-5"><CollapsibleTrigger className="group flex w-full items-center gap-1 text-left text-xs text-muted-foreground hover:text-foreground"><ChevronRight className="size-3.5 transition-transform group-aria-expanded:rotate-90" aria-hidden="true"/>Revision history · {detail.revisions.length}</CollapsibleTrigger>
          <CollapsibleContent><ul className="mt-3 space-y-3">{detail.revisions.map((revision) => <li key={revision.id}><p>{new Date(revision.created_at).toLocaleString("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} · <span className="text-muted-foreground">{revision.id === detail.published_revision_id ? "Published" : "Not published"}</span></p><details className="mt-1 text-xs text-muted-foreground"><summary className="cursor-pointer hover:text-foreground">Details</summary><p className="mt-1 break-all">Revision {revision.id}<br/>Index: {revision.index_state}</p></details></li>)}</ul></CollapsibleContent></Collapsible>
      </aside>
    </div>
  </div>;
}
