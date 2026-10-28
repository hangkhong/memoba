import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { LinkForm } from "@/modules/cases/link-form";
import { listCases } from "@/modules/cases/repository";
import { caseDetail } from "@/modules/cases/repository";
import { caseSections } from "@/modules/cases/service";
import { CaseActions } from "@/modules/cases/case-actions";
export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireWorkspace().catch((error: unknown) => { if (error instanceof AccessError && error.status === 401) redirect("/login"); throw error; });
  const id = z.uuid().safeParse((await params).id); if (!id.success) notFound();
  const detail = await caseDetail(await createServerSupabase(), context, id.data); if (!detail) notFound();
  const latest = detail.revisions.find((revision) => revision.id === detail.latest_revision_id); if (!latest) notFound();
  const candidates = (await listCases(await createServerSupabase(), context)).filter((item) => item.id !== detail.id && item.lifecycle === "active").map((item) => ({ id: item.id, title: item.revision?.content.title ?? "Case" }));
  return <div className="mx-auto max-w-4xl p-8"><Link href="/workspace/knowledge">← Knowledge Hub</Link><h1 className="mt-8 text-3xl font-semibold">{latest.content.title}</h1><p className="my-3">{detail.lifecycle} · Index: {latest.index_state}</p><p className="text-sm text-muted-foreground">Published revision: {detail.published_revision_id ?? "None"}. {latest.id !== detail.published_revision_id && "This update is not published. Retrieval continues using the previous published revision, if available."}</p>{detail.lifecycle === "active" && <Link href={`/workspace/knowledge/${detail.id}/edit`} className="my-4 inline-block underline">Edit case</Link>}<CaseActions caseId={detail.id} revisionId={latest.id} canReindex={latest.index_state !== "ready"} active={detail.lifecycle === "active"}/>{caseSections(latest.content).map((section) => <section key={section.key} className="my-7"><h2 className="text-lg font-medium">{section.key}</h2><p className="mt-2 whitespace-pre-wrap leading-7">{section.text}</p></section>)}<section><h2 className="font-medium">Sources</h2>{latest.content.sources.map((source) => <p key={source.url}><a className="underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></p>)}</section><section className="mt-8"><h2 className="font-medium">Revision history</h2>{detail.revisions.map((revision) => <details key={revision.id} className="my-3 rounded border p-3"><summary>{revision.created_at} · {revision.index_state} · {revision.id}</summary><p className="mt-3 whitespace-pre-wrap">{revision.content.approach}</p></details>)}</section><section className="mt-8"><h2 className="font-medium">Related cases</h2>{detail.lifecycle === "active" && <LinkForm caseId={detail.id} cases={candidates}/>}{detail.links.map((link) => <p key={`${link.source_id}:${link.target_id}:${link.relation_type}`}><Link className="underline" href={`/workspace/knowledge/${link.source_id === detail.id ? link.target_id : link.source_id}`}>{link.relation_type}</Link> · {link.reason}</p>)}</section></div>;
}
