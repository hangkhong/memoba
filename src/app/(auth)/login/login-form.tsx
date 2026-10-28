"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSchema } from "@/lib/auth/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const errorSchema = z.object({ error: z.string() });
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  async function submit(input: z.infer<typeof loginSchema>) {
    setError(undefined);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) {
        const raw: unknown = await response.json();
        const parsed = errorSchema.safeParse(raw);
        setError(parsed.success ? parsed.data.error : "Sign in failed. Try again."); return;
      }
      router.replace("/workspace"); router.refresh();
    } catch { setError("Cannot connect. Check that the app and Supabase are running."); }
  }
  return <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
    <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="username" required {...form.register("email")} aria-invalid={!!form.formState.errors.email}/>{form.formState.errors.email && <p className="text-sm text-destructive">Enter a valid email address.</p>}</div>
    <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" required {...form.register("password")}/></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">{form.formState.isSubmitting ? "Signing in…" : "Sign in"}</Button>
  </form>;
}
