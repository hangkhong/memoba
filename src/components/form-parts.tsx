"use client";
import type { ReactNode } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sourceSchema } from "@/modules/cases/schema";
import type { z } from "zod";

// One group of related fields. The divider sits on the wrapper so the legend stays a direct child of the fieldset and keeps naming it.
// The dialog body spaces its children by 24px and the section pads 24px under the divider, so both sides of the line match.
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <div className="border-t pt-6"><FieldSet className="gap-4"><FieldLegend className="mb-0">{title}</FieldLegend>{description && <FieldDescription>{description}</FieldDescription>}{children}</FieldSet></div>;
}

type SourceForm = { sources: z.input<typeof sourceSchema>[] };
const maxSources = 12;
// Reference links for a case or a document. The form around it provides `sources` through FormProvider.
export function SourceFields({ idPrefix }: { idPrefix: string }) {
  const { control, register, formState: { errors } } = useFormContext<SourceForm>();
  const sources = useFieldArray({ control, name: "sources" });
  return <div className="space-y-3">
    {sources.fields.length > 0 && <div aria-hidden="true" className="hidden gap-3 text-sm font-medium sm:grid sm:grid-cols-[1fr_1fr_2rem]"><span>Label</span><span>URL</span><span/></div>}
    {sources.fields.map((source, index) => <div key={source.id} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_2rem]">
      <Field><FieldLabel htmlFor={`${idPrefix}-label-${index}`} className="sm:sr-only">Source {index + 1} label</FieldLabel><Input id={`${idPrefix}-label-${index}`} required aria-invalid={!!errors.sources?.[index]?.label} {...register(`sources.${index}.label`)}/><FieldError errors={[errors.sources?.[index]?.label]}/></Field>
      <Field><FieldLabel htmlFor={`${idPrefix}-url-${index}`} className="sm:sr-only">Source {index + 1} URL</FieldLabel><Input id={`${idPrefix}-url-${index}`} type="url" required aria-invalid={!!errors.sources?.[index]?.url} {...register(`sources.${index}.url`)}/><FieldError errors={[errors.sources?.[index]?.url]}/></Field>
      <Button type="button" variant="ghost" size="icon" aria-label={`Remove source ${index + 1}`} className="text-muted-foreground" onClick={() => sources.remove(index)}><X aria-hidden="true"/></Button>
    </div>)}
    <Button type="button" variant="outline" disabled={sources.fields.length >= maxSources} onClick={() => sources.append({ label: "", url: "" })}>Add source</Button>
    <FieldError errors={[errors.sources]}/>
  </div>;
}
