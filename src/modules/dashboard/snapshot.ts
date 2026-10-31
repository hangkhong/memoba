import { z } from "zod";

// Thresholds the metric help and the attention queue share. Change them here only.
export const EVIDENCE_RATE_TARGET_PCT = 80;
export const P90_LIMIT_SECONDS = 60;
export const UNKNOWN_CITATION_LIMIT_PCT = 20;
export const DUE_REVIEW_MIN_CITATIONS = 20;
export const DUE_REVIEW_MIN_DAYS = 180;
export const OUTCOME_OVERDUE_DAYS = 30;
// A question nothing matched has no answer behind it, so it ranks as this many citations.
export const UNMATCHED_WEIGHT = 3;
export const ATTENTION_PREVIEW_COUNT = 5;

const outcomeSchema = z.enum(["achieved", "not_achieved", "unknown"]);
// A sample row has no id until its title resolves to a real case or document; a live row always has one.
const idSchema = z.string().nullable();

export const dashboardSnapshotSchema = z.object({
  source: z.enum(["sample", "live"]),
  window: z.object({ days: z.literal(30), endsAt: z.iso.datetime({ offset: true }) }),
  answers: z.object({
    total: z.number().int().nonnegative(),
    cited: z.number().int().nonnegative(),
    priorCitedRatePct: z.number().nullable(),
    unsearched: z.object({ cases: z.number().int().nonnegative(), documents: z.number().int().nonnegative() }),
    p90Seconds: z.number().nullable(),
  }),
  members: z.object({ total: z.number().int().nonnegative(), weeklyActive: z.number().int().nonnegative(), askedPriorPeriod: z.number().int().nonnegative(), returnedWithin7Days: z.number().int().nonnegative() }),
  cases: z.array(z.object({ id: idSchema, title: z.string(), author: z.string(), outcome: outcomeSchema, citations: z.number().int().nonnegative(), ageDays: z.number().int().nonnegative() })),
  documentsDueForReview: z.array(z.object({ id: idSchema, title: z.string(), owner: z.string(), citations: z.number().int().nonnegative(), effectiveFrom: z.iso.date(), daysInForce: z.number().int().nonnegative() })),
  knowledgeGaps: z.array(z.object({ topic: z.string(), asks: z.number().int().positive() })),
});
export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;
export type Outcome = z.infer<typeof outcomeSchema>;
