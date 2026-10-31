import { dashboardSnapshotSchema, type DashboardSnapshot, type Outcome } from "./snapshot";

// The only place sample values live. Titles match the demo seed so they resolve to real cases and documents.
const sampleCase = (title: string, author: string, outcome: Outcome, citations: number, ageDays: number) => ({ id: null, title, author, outcome, citations, ageDays });
const sampleDocument = (now: Date, title: string, owner: string, citations: number, effectiveFrom: string) => ({ id: null, title, owner, citations, effectiveFrom, daysInForce: Math.floor((now.getTime() - Date.parse(effectiveFrom)) / 86_400_000) });

// Totals are never typed in: contributors, the evidence meter, and the unknown share all derive from these rows.
export function sampleSnapshot(now: Date): DashboardSnapshot {
  return dashboardSnapshotSchema.parse({
    source: "sample",
    window: { days: 30, endsAt: now.toISOString() },
    answers: { total: 214, cited: 187, priorCitedRatePct: 83, unsearched: { cases: 4, documents: 9 }, p90Seconds: 38 },
    members: { total: 12, weeklyActive: 9, askedPriorPeriod: 11, returnedWithin7Days: 8 },
    cases: [
      sampleCase("Staged rollout of invoice approval workflow", "Priya Nair", "achieved", 64, 210),
      sampleCase("Payment gateway outage with a status page and fixed update cadence", "Priya Nair", "achieved", 52, 180),
      sampleCase("Xero integration rebuilt in one sprint", "Daniel Osei", "unknown", 47, 64),
      sampleCase("Starter plan price increase with grandfathering", "Mai Tran", "achieved", 41, 240),
      sampleCase("All-at-once launch of recurring invoices", "Tomás Rivera", "not_achieved", 33, 300),
      sampleCase("Dark launch of the new tax engine", "Daniel Osei", "achieved", 30, 150),
      sampleCase("API v1 sunset announcement", "Daniel Osei", "unknown", 26, 52),
      sampleCase("Duplicate-charge complaints with finance review", "Hana Sato", "achieved", 26, 120),
      sampleCase("Pro plan price increase with short notice", "Mai Tran", "not_achieved", 22, 260),
      sampleCase("Support queue migration to a new helpdesk tool", "Hana Sato", "unknown", 19, 12),
      sampleCase("Churn save for an enterprise customer with an executive sponsor call", "Mai Tran", "achieved", 18, 170),
      sampleCase("Mobile invoice capture beta", "Tomás Rivera", "unknown", 12, 47),
      sampleCase("Self-serve onboarding checklist for small customers", "Tomás Rivera", "unknown", 11, 41),
      sampleCase("Online migration of ledger entries to a new schema", "Daniel Osei", "achieved", 0, 200),
      sampleCase("Tax engine cutover during quarter close", "Daniel Osei", "not_achieved", 0, 190),
      sampleCase("QuickBooks sync migration with parallel run", "Daniel Osei", "achieved", 0, 280),
      sampleCase("Mid-market onboarding with an implementation manager", "Tomás Rivera", "achieved", 0, 160),
      sampleCase("Payment gateway outage handled by individual replies", "Hana Sato", "not_achieved", 0, 320),
      sampleCase("Churn save by discount alone", "Hana Sato", "not_achieved", 0, 230),
      sampleCase("Weekend on-call rotation for billing incidents", "Hana Sato", "achieved", 0, 140),
    ],
    documentsDueForReview: [
      sampleDocument(now, "Price change policy", "Finance and Legal", 38, "2026-01-01"),
      sampleDocument(now, "Incident communication procedure", "Customer Support", 31, "2026-04-01"),
    ],
    knowledgeGaps: [
      { topic: "Contract renewals during a price change", asks: 11 },
      { topic: "Enterprise SSO rollout", asks: 7 },
      { topic: "EU VAT on annual plans", asks: 6 },
      { topic: "Refunds for reseller customers", asks: 4 },
    ],
  });
}
