import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readAppConfig } from "@/lib/config/env";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const config = readAppConfig(process.env);
  return <main className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-6 py-12"><Link href="/" className="mb-10 flex items-center gap-3 font-semibold"><BookOpen className="size-5"/>The Memory Bank</Link><Card className="w-full max-w-sm"><CardHeader><CardTitle className="text-2xl"><h1>Welcome back</h1></CardTitle><CardDescription>Sign in to your demo workspace.</CardDescription></CardHeader><CardContent>{config.kind === "configured" ? <LoginForm/> : <p role="alert" className="text-sm">Local Supabase is not configured. Follow docs/how-to/run-locally.md to start your workspace.</p>}</CardContent></Card><p className="mt-6 max-w-sm text-center text-xs leading-5 text-muted-foreground">Access is limited to members set up for this demo.</p></main>;
}
