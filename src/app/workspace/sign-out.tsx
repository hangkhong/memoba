"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
export function SignOut() {
  const router = useRouter();
  const [error, setError] = useState(false);
  return <div><Button variant="ghost" aria-label="Sign out" title="Sign out" className="group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0" onClick={async () => { try { const response = await fetch("/api/auth/logout", { method: "POST" }); if (!response.ok) { setError(true); return; } router.replace("/login"); router.refresh(); } catch { setError(true); } }}><LogOut/><span className="group-data-[collapsible=icon]:hidden">Sign out</span></Button>{error && <p role="alert" className="text-xs text-destructive">Sign out failed. Try again.</p>}</div>;
}
