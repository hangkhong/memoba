"use client";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { DUE_REVIEW_MIN_DAYS, DUE_REVIEW_MIN_CITATIONS, EVIDENCE_RATE_TARGET_PCT, OUTCOME_OVERDUE_DAYS, P90_LIMIT_SECONDS, UNKNOWN_CITATION_LIMIT_PCT } from "./snapshot";

// Each entry states the calculation and the action it drives. Thresholds come from snapshot.ts.
const metricHelp = {
  evidence: { title: "Evidence-backed answers", how: "Completed answers with at least one citation, divided by all completed answers.", drives: `Below ${EVIDENCE_RATE_TARGET_PCT}%, read the uncited answers and record what they lacked.` },
  unsearched: { title: "Source not searched", how: "Answers where the case or document search failed or stopped partway.", drives: "Any rise is a reliability fault. Those answers may have missed evidence." },
  p90: { title: "p90 time to answer", how: "Nine in ten answers finished within this time, from send to final word.", drives: `Above ${P90_LIMIT_SECONDS} s, check the slowest runs before people stop waiting.` },
  weeklyActive: { title: "Weekly active members", how: "Members who sent at least one question in the last 7 days, over all members.", drives: "Ask the inactive members what they use instead." },
  returned: { title: "Returned within 7 days", how: "Members who asked in the previous period and asked again within 7 days.", drives: "A fall means the first answer did not earn a second question." },
  unknown: { title: "Citations on unknown outcomes", how: "Case citations landing on cases whose outcome is Unknown, over all case citations.", drives: `Above ${UNKNOWN_CITATION_LIMIT_PCT}%, advice rests on results nobody confirmed. Record those outcomes first.` },
  uncited: { title: "Cases not cited in 30 days", how: "Available cases with no citation in the window, over all available cases.", drives: "Check whether each is findable or out of date. Archive what no longer applies." },
  dueForReview: { title: "Cited documents due for review", how: `Documents with ${DUE_REVIEW_MIN_CITATIONS} or more citations whose current version took effect over ${DUE_REVIEW_MIN_DAYS} days ago.`, drives: "The owner confirms the document or publishes a new version." },
  gaps: { title: "Topics with no matching case", how: "Question topics where the case search succeeded and returned nothing. Failed searches do not count.", drives: "Record a case for the most-asked topic." },
  overdue: { title: `Cases past ${OUTCOME_OVERDUE_DAYS} days with no outcome`, how: `Available cases older than ${OUTCOME_OVERDUE_DAYS} days whose outcome is still Unknown.`, drives: "The case author records what happened." },
  contributors: { title: "Contributors", how: "Ranked by citations earned by their cases in the window, not by cases written.", drives: "Ask top earners what makes their cases reusable." },
  mostCited: { title: "Most-cited cases", how: "Case citations in the window. The outcome shows whether the advice has a proven result.", drives: "Check that heavily cited cases deserve their weight." },
} satisfies Record<string, { title: string; how: string; drives: string }>;
export type MetricKey = keyof typeof metricHelp;

// A popover, not a tooltip: it opens by touch and keyboard, and Escape returns focus to the button.
export function MetricHelp({ metric }: { metric: MetricKey }) {
  const { title, how, drives } = metricHelp[metric];
  return <Popover>
    <PopoverTrigger aria-label={`About ${title}`} className="relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none after:absolute after:-inset-2.5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"><Info className="size-3.5" aria-hidden="true"/></PopoverTrigger>
    <PopoverContent align="start" className="w-70 max-w-[calc(100vw-1.5rem)] gap-1.5 p-3 text-[13px]">
      <PopoverTitle className="font-semibold">{title}</PopoverTitle>
      <p><span className="text-muted-foreground">How it’s calculated:</span> {how}</p>
      <p><span className="text-muted-foreground">What it drives:</span> {drives}</p>
    </PopoverContent>
  </Popover>;
}
