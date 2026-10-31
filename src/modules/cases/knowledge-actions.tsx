"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/dialog-frame";
import { CaseForm } from "./case-form";
import { ImportCaseDialog } from "./import-flow";

export function KnowledgeActions({ concepts, defaultRecord }: { concepts: { id: string; label: string }[]; defaultRecord: boolean }) {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  const [panel, setPanel] = useState<"record" | "import" | null>(defaultRecord ? "record" : null);
  function close() { setPanel(null); if (params.has("record")) router.replace(pathname); }
  function saved(caseId: string) { setPanel(null); router.push(`/workspace/knowledge/${caseId}`); router.refresh(); }
  return <>
    <div className="flex gap-2"><Button variant="outline" onClick={() => setPanel("import")}>Import from notes</Button><Button onClick={() => setPanel("record")}>Record a case</Button></div>
    <FormDialog open={panel === "record"} onOpenChange={(next) => { if (!next) close(); }} title="Record a case" description="Capture the problem, your approach, and what happened.">
      <CaseForm concepts={concepts} onCancel={close} onSaved={saved}/>
    </FormDialog>
    <ImportCaseDialog open={panel === "import"} onClose={close} concepts={concepts} onSaved={saved}/>
  </>;
}
