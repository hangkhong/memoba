"use client";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Shared frame for the case dialogs: fixed header, scrolling body, fixed footer.
export function CaseDialog({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children: ReactNode }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex max-h-[min(92svh,56rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
    <DialogHeader className="shrink-0 gap-1.5 border-b px-6 py-4 pr-14"><DialogTitle className="text-base">{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    {children}
  </DialogContent></Dialog>;
}
export function CaseDialogBody({ children }: { children: ReactNode }) { return <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">{children}</div>; }
export function CaseDialogFooter({ children }: { children: ReactNode }) { return <div className="flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">{children}</div>; }
