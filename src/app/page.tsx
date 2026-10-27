import Link from "next/link";
import { ArrowUpRight, BookOpen, Layers3 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { readAIConfig } from "@/lib/config/env";

export default function Home() {
  const ai = readAIConfig(process.env);
  return <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 md:px-12">
    <header className="flex items-center justify-between border-b pb-6"><Link href="/" className="flex items-center gap-3 text-lg font-semibold"><BookOpen className="size-5"/> The Memory Bank</Link><Badge variant="outline">Local workspace</Badge></header>
    <section className="grid flex-1 items-center gap-12 py-20 md:grid-cols-[1.4fr_1fr]">
      <div><p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Experience, with evidence</p><h1 className="max-w-2xl text-5xl leading-[1.08] font-semibold tracking-tight md:text-6xl">Start your next decision with what you already know.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Capture the context, decisions, and outcomes behind your work. Bring that experience into the next challenge with sources you can inspect.</p><Link href="/workspace" className={buttonVariants({ className: "mt-9" })}>Open workspace <ArrowUpRight className="ml-2 size-4"/></Link></div>
      <div className="rounded-2xl border bg-muted/30 p-8"><Layers3 className="mb-6 size-7 text-muted-foreground"/><p className="text-sm text-muted-foreground">Two ways to capture experience</p><h2 className="mt-3 text-xl font-medium">Product / Delivery</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Changes, decisions, deployment conditions, and observed results.</p><div className="my-6 border-t"/><h2 className="text-xl font-medium">CS / Operations</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Customer impact, handling conditions, escalations, and lessons.</p><div className="mt-8 border-t pt-5 text-sm text-muted-foreground">{ai.kind === "configured" ? "AI configuration present. Capability verification is pending." : "AI analysis is unavailable until model access is configured."}</div></div>
    </section><footer className="border-t py-5 text-xs text-muted-foreground">A knowledge workspace for the next decision.</footer>
  </main>;
}
