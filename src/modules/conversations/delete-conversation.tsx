"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import { z } from "zod";

const errorBody = z.object({ error: z.string() });
// A sidebar row action for a conversation the user wrote. Deleting is permanent, so it asks first.
export function DeleteConversationAction({ id, title }: { id: string; title: string }) {
  const router = useRouter(); const pathname = usePathname();
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  function close() { if (busy) return; setOpen(false); setError(""); }
  async function remove() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (!response.ok) { const body = errorBody.safeParse(await response.json().catch(() => null)); setError(body.success ? body.data.error : "Could not delete this conversation."); return; }
      setOpen(false);
      if (pathname === `/workspace/chat/${id}`) router.replace("/workspace/chat");
      router.refresh();
    } catch { setError("Connection unavailable."); } finally { setBusy(false); }
  }
  return <>
    <SidebarMenuAction showOnHover aria-label={`Delete conversation: ${title}`} onClick={() => setOpen(true)}><Trash2 aria-hidden="true"/></SidebarMenuAction>
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}><DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle className="text-base">Delete this conversation?</DialogTitle><DialogDescription>Its questions and answers are removed for everyone in the workspace. This can’t be undone.</DialogDescription></DialogHeader>
      <p className="line-clamp-3 rounded-md bg-muted px-3 py-2 text-sm break-words">{title}</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => { void remove(); }}>Delete conversation</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}
