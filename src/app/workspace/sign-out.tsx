"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function SignOut() {
  const router = useRouter();
  const [error, setError] = useState(false);
  return <div><Button variant="ghost" onClick={async () => { try { const response = await fetch("/api/auth/logout", { method: "POST" }); if (!response.ok) { setError(true); return; } router.replace("/login"); router.refresh(); } catch { setError(true); } }}>Sign out</Button>{error && <p role="alert" className="text-xs text-destructive">Sign out failed. Try again.</p>}</div>;
}
