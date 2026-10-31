# Dashboard design

The Dashboard answers one question: is the knowledge base working, and what should the PM do next? Prototype: [`docs/superpowers/prototypes/dashboard.html`](../prototypes/dashboard.html). It uses sample rows, and its calculations, tooltips, and ranking are the reference for the build.

## Decisions

| Decision | Reason |
|---|---|
| The page title is the finding, set in `.page-title`; "Dashboard" stays in the bar | The first read is what needs attention, not a label |
| One divided container holds four cells, one per question | Every agreed metric fits under its question, with no second metric row |
| Each cell has one main figure and quiet sub-rows. The lead is 34px, the others 24px | The evidence-backed rate must be the largest figure |
| Main figures: evidence-backed answers, weekly active members, citations on unknown outcomes, topics with no matching case | Each is the sharpest signal for its question |
| "Answers with at least one citation" is the headline, not a separate row | They are the same number; one figure, one place |
| Needs attention is one ranked list, top five, then "View all" | It carries the page's main job. Each row names the evidence, the owner, and one action |
| Rank score is citations, or asks × 3, or failed answers × 3 | An unmatched question has no answer behind it, so it weighs more than a citation. Tune this later |
| No trend chart and no chart library | A 30-day delta gives direction; weekly points on this volume are noise |
| Two plain `div` marks only: a two-part evidence meter and citation bars on most-cited cases | Part-to-whole and row comparison are the only shapes that read faster than the figure |
| Teal (`--chart-1`) is the only data hue. Bars for Unknown outcomes are grey | The grey bar matches the neutral Unknown pill and makes the weak evidence visible |
| Contributors show citations as the only large figure, with case count beneath | Priya's 2 cases outrank Daniel's 6, which is the point |
| The Sample data pill sits in the sticky `PageBar` | It stays visible at every scroll position and width |
| Metric help is an info button opening a `Popover`, not `HoverCard` or `Tooltip` | It must work by touch and keyboard. Each states the calculation and the action |

## Page frame

Use `PageFrame` and `PageBar`. Do not use `PageBody`: its rail column does not apply. Add a `@container` wrapper with `px-(--page-inset) pt-6 pb-24`, `max-w-[76rem] mx-auto`, and 24px gaps. Use container queries, not viewport breakpoints, because the sidebar changes the available width.

| Container | Layout |
|---|---|
| Over 1000px | KPI cells 1.2:1:1:1; lower row 2:1:1; queue rows have kind, item, owner, action columns |
| 641–1000px | KPI 2 × 2; cases full width, contributors and gaps side by side; kind joins the evidence line, owner hidden |
| 640px or less | One column; a link under the finding jumps to the queue; rows stack with a 44px text action |

## States

- **Sample:** always in this release. The bar shows the pill.
- **Empty:** frame and headers stay. Rates print a grey dash, counts print `0`, and each block has one sentence. Do not print 0% for a rate with no denominator.
- **Loading:** flat grey bars at the final size, with no shimmer.
- **Error:** inside the failed block: what failed, last good time, Retry.
- **Partial:** for a live query, a failed block does not hide the others.

## `DashboardSnapshot`

Add `src/modules/dashboard/`: `snapshot.ts` (Zod schema and inferred types), `sample-snapshot.ts` (the sample rows), and `attention.ts` (`buildAttentionQueue(snapshot)`, unit tested). `sample-snapshot.ts` holds the only sample values. It computes totals from rows, so figures cannot disagree. Port the rows from the prototype.

```ts
type Outcome = "achieved" | "not_achieved" | "unknown";
type DashboardSnapshot = {
  source: "sample" | "live";
  window: { days: 30; endsAt: string };
  answers: { total: number; cited: number; priorCitedRatePct: number | null; unsearched: { cases: number; documents: number }; p90Seconds: number | null };
  members: { total: number; weeklyActive: number; askedPriorPeriod: number; returnedWithin7Days: number };
  cases: { id: string; title: string; author: string; outcome: Outcome; citations: number; ageDays: number }[];
  documentsDueForReview: { id: string; title: string; owner: string; citations: number; effectiveFrom: string; daysInForce: number }[];
  knowledgeGaps: { topic: string; asks: number }[];
};
```

The page takes one async `getDashboardSnapshot()`, which returns the sample today. A live version replaces that function body and nothing else. Seed case titles resolve to IDs by slug at render time so queue links open real cases.

Thresholds in the tooltips (80%, 60 s, 20%, 20 citations, 180 days) are constants in `snapshot.ts`.

## Components

New, in `src/modules/dashboard/`: `dashboard-page.tsx`, `kpi-strip.tsx`, `metric-help.tsx`, `attention-queue.tsx`, `most-cited-cases.tsx`, `contributors.tsx`, `knowledge-gaps.tsx`.

Reuse: `PageFrame`, `PageBar`, `Pill`, `outcomeLabels`, `outcomeTones`, `Button`, `Popover`, `Skeleton`. Add one `SampleDataPill`. The route is `src/app/workspace/dashboard/page.tsx`, kept thin.

Actions: Record outcome goes to `/workspace/knowledge/[id]?edit=1`, Record case to `/workspace/knowledge?record=1`, and Open document to the document page. View answers goes to the latest affected conversation.

Sidebar in `workspace-sidebar.tsx`: New chat, Dashboard (`ChartNoAxesColumn`), Knowledge Hub. In `SidebarFooter`, above Sign out, a disabled `SidebarMenuButton` for Roadmap (`Map`) with a "Soon" label, hidden label in icon mode with the tooltip "Roadmap · Soon".

Update `docs/architecture/ui-presentation.md` when this lands.

## Live data gaps

The sample hides three things a real query needs. Documents have no review date, so `effectiveFrom` stands in. Topics are not clustered, so grouping empty case searches needs new work. The demo seed has one member, so the sample contributors are invented names.
