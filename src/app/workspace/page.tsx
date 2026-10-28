import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ArrowUpRight, FileText } from "lucide-react";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { readAIConfig } from "@/lib/config/env";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabase } from "@/lib/supabase/server";
import { listCases } from "@/modules/cases/repository";
import { CaseLibrary } from "@/modules/cases/case-library";
import { recentRuns } from "@/modules/analysis/repository";
import { SignOut } from "./sign-out";

export default async function WorkspacePage() {
  const context = await requireWorkspace().catch((error: unknown) => { if (error instanceof AccessError && error.status === 401) redirect("/login"); return null; });
  if (!context) return <main className="mx-auto max-w-lg p-10"><h1 className="text-2xl font-semibold">Workspace unavailable</h1><p className="my-4 text-muted-foreground">This account does not have workspace access, or the local service is unavailable.</p><Link href="/login">Return to sign in</Link></main>;
  const ai = readAIConfig(process.env);
  const client = await createServerSupabase();
  const cases = await listCases(client, context);
  const runs = await recentRuns(client, context);
  return <main className="mx-auto max-w-6xl px-6 py-8 md:px-12"><header className="flex items-center justify-between border-b pb-6"><Link href="/" className="flex items-center gap-3 font-semibold"><BookOpen className="size-5"/>The Memory Bank</Link><SignOut/></header><section className="py-14"><p className="text-sm text-muted-foreground">Your knowledge workspace</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">{context.workspaceName}</h1><p className="mt-4 max-w-xl leading-7 text-muted-foreground">Keep the experience behind your decisions, ready for the next challenge.</p></section><Alert className="mb-8"><AlertTitle>{ai.kind === "unavailable" ? "AI analysis is unavailable" : "Gemini model access configured"}</AlertTitle><AlertDescription>Save structured cases to build evidence for your next request.</AlertDescription></Alert><div className="grid gap-6 md:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-3"><BookOpen className="size-5"/>Case library</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">Cases keep immutable revisions. New revisions enter retrieval after indexing succeeds.</p><Link className="mt-4 inline-block underline" href="/workspace/cases/new">Record a case</Link></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-3"><FileText className="size-5"/>New request</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">Prepare a structured request with an objective, context, constraints, and unknowns.</p><Link className="mt-4 inline-flex items-center gap-2 text-sm font-medium" href="/workspace/requests/new">Prepare request <ArrowUpRight className="size-4"/></Link></CardContent></Card></div><CaseLibrary cases={cases.flatMap((item) => item.revision ? [{ id: item.id, title: item.revision.content.title, problem: item.revision.content.problem, template: item.revision.content.template, outcome: item.revision.content.outcome, lifecycle: item.lifecycle, indexState: item.revision.index_state, pendingUpdate: !!item.published_revision_id && item.latest_revision_id !== item.published_revision_id }] : [])}/><section className="my-10"><h2 className="text-xl font-semibold">Recent analyses</h2>{runs.length === 0 && <p className="mt-4 text-muted-foreground">No saved analyses yet.</p>}{runs.map((run) => <p key={run.id} className="mt-4"><Link className="underline" href={`/workspace/analyses/${run.id}`}>{run.request.objective}</Link> · {run.status}</p>)}</section></main>;
}
