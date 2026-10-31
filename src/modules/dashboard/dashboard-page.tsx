import { PageBar, PageFrame } from "@/components/page-frame";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { createServerSupabase } from "@/lib/supabase/server";
import { caseRows } from "@/modules/cases/case-rows";
import { listCases } from "@/modules/cases/repository";
import { listConversations } from "@/modules/conversations/repository";
import { documentRows } from "@/modules/documents/document-rows";
import { listDocuments } from "@/modules/documents/repository";
import { attentionActionLabels, attentionHref, attentionKindLabels, buildAttentionQueue } from "./attention";
import { AttentionQueue, type AttentionRow } from "./attention-queue";
import { Contributors } from "./contributors";
import { KnowledgeGaps } from "./knowledge-gaps";
import { KpiStrip } from "./kpi-strip";
import { dashboardFinding, dashboardMetrics } from "./metrics";
import { MostCitedCases } from "./most-cited-cases";
import { SampleDataPill } from "./sample-data-pill";
import { getDashboardSnapshot, resolveSnapshotIds } from "./service";

export async function DashboardPage({ context }: { context: WorkspaceContext }) {
  const supabase = await createServerSupabase();
  const [sample, cases, documents, conversations] = await Promise.all([getDashboardSnapshot(), listCases(supabase, context), listDocuments(supabase, context), listConversations(supabase, context)]);
  const snapshot = resolveSnapshotIds(sample, { cases: caseRows(cases, []).filter((row) => row.lifecycle === "active"), documents: documentRows(documents).filter((row) => row.lifecycle === "active") });
  const metrics = dashboardMetrics(snapshot);
  const queue = buildAttentionQueue(snapshot);
  const latestConversationId = conversations[0]?.id ?? null;
  const rows = queue.map((item): AttentionRow => ({ key: `${item.kind}:${item.title}`, kind: attentionKindLabels[item.kind], title: item.title, evidence: item.evidence, owner: item.owner, actionLabel: attentionActionLabels[item.action], href: attentionHref(item, latestConversationId) }));
  return <PageFrame>
    <div className="@container flex flex-1 flex-col">
      <PageBar>
        <SidebarTrigger className="-ml-1 text-muted-foreground md:hidden"/>
        <span className="text-sm font-semibold">Dashboard</span>
        <span className="ml-auto text-xs whitespace-nowrap text-muted-foreground @max-[640px]:hidden">Last {snapshot.window.days} days</span>
        {snapshot.source === "sample" && <SampleDataPill/>}
      </PageBar>
      <main className="mx-auto flex w-full max-w-[76rem] text-sm flex-col gap-6 px-(--page-inset) pt-6 pb-24 @max-[640px]:gap-4 @max-[640px]:pt-4 @max-[640px]:pb-16">
        <div><h1 className="page-title max-w-[44rem] leading-[1.3] @max-[640px]:text-xl">{dashboardFinding(snapshot, metrics)}</h1>{queue.length > 0 && <a href="#attention" className="mt-2 hidden font-medium text-chart-1 @max-[640px]:inline-block">{queue.length} items need attention</a>}</div>
        <KpiStrip snapshot={snapshot} metrics={metrics}/>
        <AttentionQueue rows={rows}/>
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 @max-[1000px]:grid-cols-2 @max-[640px]:grid-cols-1">
          <MostCitedCases cases={metrics.topCases}/>
          <Contributors contributors={metrics.contributors}/>
          <KnowledgeGaps gaps={snapshot.knowledgeGaps}/>
        </div>
      </main>
    </div>
  </PageFrame>;
}
