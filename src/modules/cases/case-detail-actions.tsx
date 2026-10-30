"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { savedCaseSchema } from "./contracts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CaseDialog } from "./case-dialog";
import { CaseForm } from "./case-form";
import type { CaseInput } from "./schema";

export function CaseHeaderActions({ caseId, title, initial, concepts, defaultEdit }: { caseId: string; title: string; initial: CaseInput; concepts: { id: string; label: string }[]; defaultEdit: boolean }) {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  const [panel, setPanel] = useState<"edit" | "archive" | null>(defaultEdit ? "edit" : null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  function close() { setPanel(null); setError(""); if (params.has("edit")) router.replace(pathname); }
  async function archive() {
    setBusy(true); setError("");
    try { const response = await fetch(`/api/cases/${caseId}/archive`, { method: "POST" }); if (!response.ok) { setError("Could not archive this case."); return; } setPanel(null); router.refresh(); }
    catch { setError("Connection unavailable."); } finally { setBusy(false); }
  }
  return <>
    <div className="flex gap-2"><Button variant="outline" onClick={() => setPanel("archive")}>Archive</Button><Button onClick={() => setPanel("edit")}>Edit case</Button></div>
    <CaseDialog open={panel === "edit"} onOpenChange={(next) => { if (!next) close(); }} title="Edit case" description="Saving creates a new revision. Earlier revisions and their citations stay as they were.">
      <CaseForm initial={initial} caseId={caseId} concepts={concepts} onCancel={close} onSaved={() => { close(); router.refresh(); }}/>
    </CaseDialog>
    <Dialog open={panel === "archive"} onOpenChange={(next) => { if (!next) close(); }}><DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle className="text-base">Archive “{title}”?</DialogTitle><DialogDescription>It stops appearing in new answers. Its history and earlier citations stay available.</DialogDescription></DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => { void archive(); }}>Archive case</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}

export function ReindexButton({ caseId, revisionId }: { caseId: string; revisionId: string }) {
  const router = useRouter(); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try { const response = await fetch(`/api/cases/${caseId}/revisions/${revisionId}/reindex`, { method: "POST" }); if (!response.ok) setMessage("Could not update this case."); else { const result = savedCaseSchema.safeParse(await response.json()); setMessage(result.success && result.data.indexState === "ready" ? "Indexed and available to ask." : "Saved, but indexing did not complete. Retry indexing."); } router.refresh(); }
    catch { setMessage("Connection unavailable."); } finally { setBusy(false); }
  }
  return <div className="mt-3 space-y-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => { void run(); }}>Retry indexing</Button>{message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}</div>;
}
