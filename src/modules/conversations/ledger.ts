import { executionLimits } from "@/lib/contracts/limits";
import type { DisclosedSource } from "@/modules/knowledge/contracts";
import type { ConversationDetail } from "./view-schema";

// Evidence belongs to the conversation: every source a completed text answer cited stays held, newest answer first.
// Saved brief evidence supplies the snapshots; a legacy brief has no markers, so it contributes none.
export function earlierSources(turns: ConversationDetail["turns"]): DisclosedSource[] {
  const held = new Map<string, DisclosedSource>();
  for (const turn of [...turns].reverse()) {
    const brief = turn.runs.filter((run) => run.status === "complete" && run.brief).at(-1)?.brief;
    if (!brief || !("version" in brief.generated)) continue;
    const snapshots = new Map(brief.evidence.map((item) => [item.evidenceId, item]));
    for (const { marker, evidenceId } of brief.generated.citations) {
      const evidence = snapshots.get(evidenceId);
      if (evidence && !held.has(marker)) held.set(marker, { marker, evidence });
    }
  }
  return [...held.values()].slice(0, executionLimits.ledgerSources);
}
