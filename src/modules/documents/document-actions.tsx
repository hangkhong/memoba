"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive as ArchiveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormDialog } from "@/components/dialog-frame";
import { DocumentForm } from "./document-form";
import type { DocumentInput } from "./schema";

export function AddDocumentAction() {
  const router = useRouter(); const [open, setOpen] = useState(false);
  return <>
    <Button onClick={() => setOpen(true)}>Add document</Button>
    <FormDialog open={open} onOpenChange={setOpen} title="Add document" description="Add a policy, procedure, or guideline. The agent reads it as what must happen, apart from recorded cases.">
      <DocumentForm onCancel={() => setOpen(false)} onSaved={(id) => { setOpen(false); router.push(`/workspace/knowledge/documents/${id}`); router.refresh(); }}/>
    </FormDialog>
  </>;
}

export function DocumentHeaderActions({ documentId, title, initial, defaultEdit }: { documentId: string; title: string; initial: DocumentInput; defaultEdit: boolean }) {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  const [panel, setPanel] = useState<"edit" | "archive" | null>(defaultEdit ? "edit" : null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  function close() { setPanel(null); setError(""); if (params.has("edit")) router.replace(pathname); }
  async function archive() {
    setBusy(true); setError("");
    try { const response = await fetch(`/api/documents/${documentId}/archive`, { method: "POST" }); if (!response.ok) { setError("Could not archive this document."); return; } setPanel(null); router.refresh(); }
    catch { setError("Connection unavailable."); } finally { setBusy(false); }
  }
  return <>
    <div className="flex shrink-0 gap-2"><Button variant="outline" aria-label="Archive" onClick={() => setPanel("archive")}><ArchiveIcon aria-hidden="true" className="md:hidden"/><span className="hidden md:inline">Archive</span></Button><Button onClick={() => setPanel("edit")}>Edit document</Button></div>
    <FormDialog open={panel === "edit"} onOpenChange={(next) => { if (!next) close(); }} title="Edit document" description="Saving creates a new version. Earlier versions and their citations stay as they were.">
      <DocumentForm initial={initial} documentId={documentId} onCancel={close} onSaved={() => { close(); router.refresh(); }}/>
    </FormDialog>
    <Dialog open={panel === "archive"} onOpenChange={(next) => { if (!next) close(); }}><DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle className="text-base">Archive “{title}”?</DialogTitle><DialogDescription>It stops appearing in new answers. Its history and earlier citations stay available.</DialogDescription></DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => { void archive(); }}>Archive document</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}
