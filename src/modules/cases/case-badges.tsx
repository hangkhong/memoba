import { cn } from "cn";
import { outcomeLabels, outcomeTones, statusRegistry, templateLabels, toneStyles, type CaseStatus, type Tone } from "./presentation";
import type { CaseInput } from "./schema";

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs whitespace-nowrap", toneStyles[tone].pill)}>{children}</span>;
}
export function OutcomePill({ outcome }: { outcome: CaseInput["outcome"] }) { return <Pill tone={outcomeTones[outcome]}>{outcomeLabels[outcome]}</Pill>; }
export function TemplateChip({ template }: { template: CaseInput["template"] }) { return <span className="inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">{templateLabels[template]}</span>; }
export function StatusDot({ status }: { status: CaseStatus }) {
  const { label, tone } = statusRegistry[status];
  return <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap"><span aria-hidden="true" className={cn("size-1.5 rounded-full", toneStyles[tone].dot)}/>{label}</span>;
}
export function Tag({ children }: { children: React.ReactNode }) { return <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground">{children}</span>; }
