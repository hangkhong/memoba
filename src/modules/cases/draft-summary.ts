import type { CaseDraftValues, SectionKey } from "./draft-contract";
import { sectionLabels, templateFields, templateLabels } from "./presentation";

const common = ["problem", "context", "constraints", "approach", "observedOutcome", "lessons"] as const satisfies SectionKey[];
// Facts about a draft, read from the drafting response only.
export function draftSummary(draft: CaseDraftValues, missing: readonly SectionKey[]) {
  const keys: SectionKey[] = [...common, ...templateFields[draft.template]];
  const filled = keys.filter((key) => key in draft && /\S/.test(String((draft as Record<string, unknown>)[key] ?? ""))).length;
  return { template: templateLabels[draft.template], filled, total: keys.length, missing: missing.map((key) => sectionLabels[key]) };
}
