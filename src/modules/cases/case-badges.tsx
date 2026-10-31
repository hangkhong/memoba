import { Pill } from "@/components/badges";
import { outcomeLabels, outcomeTones, templateLabels } from "./presentation";
import type { CaseInput } from "./schema";

export function OutcomePill({ outcome }: { outcome: CaseInput["outcome"] }) { return <Pill tone={outcomeTones[outcome]}>{outcomeLabels[outcome]}</Pill>; }
export function TemplateChip({ template }: { template: CaseInput["template"] }) { return <span className="inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">{templateLabels[template]}</span>; }
