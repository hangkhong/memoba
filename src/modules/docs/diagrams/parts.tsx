import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// One visual language with the landing page: a circle is a case (teal), a square is a document (ink). Red is only for a failed source.
export type Kind = "case" | "doc";

export function Mark({ kind, state = "solid", className }: { kind: Kind; state?: "solid" | "ghost" | "failed"; className?: string }) {
  const tone = state === "failed" ? "border-2 border-destructive" : state === "ghost" ? (kind === "case" ? "border-2 border-dashed border-chart-1" : "border-2 border-dashed border-primary") : kind === "case" ? "bg-chart-1" : "bg-primary";
  return <span aria-hidden className={cn("inline-block size-4 shrink-0", kind === "case" ? "rounded-full" : "rounded-none", tone, className)} />;
}

export function Legend() {
  return <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
    <span className="inline-flex items-center gap-2"><Mark kind="case" className="size-3"/>Case: what happened</span>
    <span className="inline-flex items-center gap-2"><Mark kind="doc" className="size-3"/>Document: what is required</span>
  </div>;
}

// The group label is the text alternative for the whole diagram. The words inside are real text, so a screen reader also reads them in order.
export function DiagramFrame({ label, children, note }: { label: string; children: ReactNode; note?: ReactNode }) {
  return <div role="group" aria-label={label} className="@container rounded-xl border bg-muted/40 p-3 text-sm leading-5 text-foreground @md:p-4">
    {children}
    {note ? <div className="mt-3 text-xs text-muted-foreground">{note}</div> : null}
  </div>;
}

export function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { id: T; text: string }[]; value: T; onChange: (id: T) => void }) {
  return <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
    <span aria-hidden className="text-xs font-medium text-muted-foreground">{label}</span>
    {options.map((option) => <button key={option.id} type="button" aria-pressed={option.id === value} onClick={() => onChange(option.id)}
      className="min-h-9 cursor-pointer rounded-full border bg-background px-3 text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground motion-reduce:transition-none">{option.text}</button>)}
  </div>;
}

export const eyebrow = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";
