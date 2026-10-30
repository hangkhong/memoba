"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { relationTypeSchema } from "./schema";
import { relationOptions, type LinkDirection } from "./presentation";
import { inputLimits } from "@/lib/contracts/limits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/option-select";

export type RelatedLink = { key: string; source: string; target: string; other: string; title: string; relation: z.infer<typeof relationTypeSchema>; direction: LinkDirection; reason: string };
const schema = z.object({ target: z.uuid("Choose a case."), relation: relationTypeSchema, reason: z.string().trim().min(1, "Enter a reason.").max(inputLimits.text), archiveTarget: z.boolean() }).refine((input) => !input.archiveTarget || input.relation === "supersedes");
type FormValues = z.infer<typeof schema>;
const errorBody = z.object({ error: z.string() });

// Adds a link from this case, or edits an existing one. Editing keeps the other case fixed.
export function LinkDialog({ caseId, cases, link, onClose }: { caseId: string; cases: { id: string; title: string }[]; link?: RelatedLink; onClose: () => void }) {
  const router = useRouter(); const [error, setError] = useState("");
  const direction = link?.direction ?? "outgoing"; const editing = !!link;
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { target: link?.other ?? "", relation: link?.relation ?? "related_to", reason: link?.reason ?? "", archiveTarget: false } });
  const relation = useWatch({ control: form.control, name: "relation" });
  async function submit(input: FormValues) {
    setError("");
    try {
      const response = link
        ? await fetch(`/api/cases/${caseId}/links`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: link.source, target: link.target, relation: link.relation, newRelation: input.relation, reason: input.reason }) })
        : await fetch(`/api/cases/${caseId}/links`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, archiveTarget: input.relation === "supersedes" && input.archiveTarget }) });
      if (!response.ok) { const parsed = errorBody.safeParse(await response.json().catch(() => null)); setError(parsed.success ? parsed.data.error : "Cannot save link. Check the selected relation and access."); return; }
      onClose(); router.refresh();
    } catch { setError("Connection unavailable."); }
  }
  const caseItems = link ? [{ value: link.other, label: link.title }] : cases.map((item) => ({ value: item.id, label: item.title }));
  const errors = form.formState.errors;
  return <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}><DialogContent className="sm:max-w-md">
    <DialogHeader><DialogTitle className="text-base">{editing ? "Edit related case" : "Add related case"}</DialogTitle><DialogDescription>{editing ? "Change how these cases relate. The other case stays the same." : "Link a case that explains or contrasts with this one."}</DialogDescription></DialogHeader>
    <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
      <Field data-invalid={!!errors.target}><FieldLabel htmlFor="linked-case">Case</FieldLabel><Controller control={form.control} name="target" render={({ field }) => <OptionSelect id="linked-case" items={caseItems} value={field.value || null} placeholder="Choose a case" className="w-full" disabled={editing} invalid={!!errors.target} onValueChange={field.onChange}/>}/><FieldError errors={[errors.target]}/></Field>
      <Field><FieldLabel htmlFor="relation">Relation</FieldLabel><Controller control={form.control} name="relation" render={({ field }) => <OptionSelect id="relation" items={relationOptions(direction)} value={field.value} className="w-full" onValueChange={field.onChange}/>}/></Field>
      <Field data-invalid={!!errors.reason}><FieldLabel htmlFor="link-reason">Reason</FieldLabel><Input id="link-reason" required maxLength={inputLimits.text} aria-invalid={!!errors.reason} {...form.register("reason")}/><FieldError errors={[errors.reason]}/></Field>
      {!editing && relation === "supersedes" && <div className="flex items-start gap-2"><Controller control={form.control} name="archiveTarget" render={({ field }) => <Checkbox id="archive-target" className="mt-0.5" checked={field.value} onCheckedChange={field.onChange}/>}/><Label htmlFor="archive-target" className="font-normal leading-5">Also archive the selected case</Label></div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={form.formState.isSubmitting}>{editing ? "Save changes" : "Add case"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}

export function RemoveLinkDialog({ caseId, link, onClose }: { caseId: string; link: RelatedLink; onClose: () => void }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function remove() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/cases/${caseId}/links`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: link.source, target: link.target, relation: link.relation }) });
      if (!response.ok) { setError("Could not remove this link."); return; }
      onClose(); router.refresh();
    } catch { setError("Connection unavailable."); } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}><DialogContent className="sm:max-w-md">
    <DialogHeader><DialogTitle className="text-base">Remove link to “{link.title}”?</DialogTitle><DialogDescription>The cases stop showing each other as related, and answers stop following this link.{link.relation === "supersedes" ? " Removing a Supersedes link does not restore an archived case." : ""}</DialogDescription></DialogHeader>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={() => { void remove(); }}>Remove link</Button></DialogFooter>
  </DialogContent></Dialog>;
}
