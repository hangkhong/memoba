"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function CaseActions({ caseId, revisionId, canReindex, active }: { caseId: string; revisionId: string; canReindex: boolean; active: boolean }) {
  const router = useRouter(); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function run(path: string) { setBusy(true); try { const response = await fetch(path, { method: "POST" }); setMessage(response.ok ? "Updated." : "Could not update this case."); router.refresh(); } catch { setMessage("Connection unavailable."); } finally { setBusy(false); } }
  return <div className="my-4 flex flex-wrap gap-3">{active && canReindex && <Button disabled={busy} onClick={() => run(`/api/cases/${caseId}/revisions/${revisionId}/reindex`)}>Retry indexing</Button>}{active && <Button disabled={busy} variant="outline" onClick={() => run(`/api/cases/${caseId}/archive`)}>Archive case</Button>}<p role="status">{message}</p></div>;
}
