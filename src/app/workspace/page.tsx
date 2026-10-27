import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ArrowUpRight, FileText } from "lucide-react";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { readAIConfig } from "@/lib/config/env";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOut } from "./sign-out";

export default async function WorkspacePage() {
  const context = await requireWorkspace().catch((error: unknown) => { if (error instanceof AccessError && error.status === 401) redirect("/login"); return null; });
  if (!context) return <main className="mx-auto max-w-lg p-10"><h1 className="text-2xl font-semibold">Workspace unavailable</h1><p className="my-4 text-muted-foreground">This account does not have workspace access, or the local service is unavailable.</p><Link href="/login">Return to sign in</Link></main>;
  const ai = readAIConfig(process.env);
  return <main className="mx-auto max-w-6xl px-6 py-8 md:px-12"><header className="flex items-center justify-between border-b pb-6"><Link href="/" className="flex items-center gap-3 font-semibold"><BookOpen className="size-5"/>The Memory Bank</Link><SignOut/></header><section className="py-14"><p className="text-sm text-muted-foreground">Your knowledge workspace</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">{context.workspaceName}</h1><p className="mt-4 max-w-xl leading-7 text-muted-foreground">Keep the experience behind your decisions, ready for the next challenge.</p></section><Alert className="mb-8"><AlertTitle>{ai.kind === "unavailable" ? "AI analysis is unavailable" : "Model access awaits verification"}</AlertTitle><AlertDescription>Case indexing and brief generation become available after model access and embedding dimensions are verified.</AlertDescription></Alert><div className="grid gap-6 md:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-3"><BookOpen className="size-5"/>Case library</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">The library is being connected to immutable case revisions. No cases have been indexed.</p></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-3"><FileText className="size-5"/>New request</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">Prepare a structured request with an objective, context, constraints, and unknowns.</p><Link className="mt-4 inline-flex items-center gap-2 text-sm font-medium" href="/workspace/requests/new">Prepare request <ArrowUpRight className="size-4"/></Link></CardContent></Card></div></main>;
}
