import Link from "next/link";
import { BookOpen } from "lucide-react";
import { readAppConfig } from "@/lib/config/env";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const config = readAppConfig(process.env);
  return <main className="flex min-h-svh items-center justify-center bg-sidebar px-4 py-10"><section className="w-full max-w-md rounded-2xl border bg-background p-7 md:p-10"><Link href="/" className="mb-9 flex items-center gap-3 font-semibold"><BookOpen className="size-5 text-[var(--evidence-accent)]"/>The Memoba</Link><h1 className="page-title">Sign in</h1><p className="page-description mb-7">Continue to your demo workspace.</p>{config.kind === "configured" ? <LoginForm/> : <p role="alert" className="text-sm">Local Supabase is not configured. Follow docs/how-to/run-locally.md to start your workspace.</p>}<p className="mt-7 text-xs leading-5 text-muted-foreground">Access is limited to members set up for this demo.</p></section></main>;
}
