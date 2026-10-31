import type { DocumentInput } from "../../../src/modules/documents/schema";
import { wiki } from "../builders.ts";

type Base = Pick<DocumentInput, "title" | "description" | "type" | "area" | "owner" | "sources">;
const base: Base = {
  title: "Production release procedure",
  description: "Use when shipping a feature, migration, integration, or pricing or tax change that customers can notice to production. It sets who owns the release, how it reaches customers, when it must not ship, and when to stop.",
  type: "procedure", area: "Engineering", owner: "Platform Engineering",
  sources: [{ label: "Release handbook", url: wiki("engineering/release-handbook") }],
};

const v1: DocumentInput = {
  ...base, effectiveFrom: "2025-09-01",
  body: `## Purpose and scope

This procedure sets the minimum conditions for putting a change in front of customers. It was written after the recurring invoices launch, which reached every customer on a Friday afternoon without a way to turn it off.

It applies to every change to production that customers can notice: new features, changes to invoice sending, payments, tax or pricing logic, data migrations, and integrations. It does not apply to internal tooling, documentation, or changes behind an internal-only flag.

## Rules

1. Every customer-visible change ships behind a feature flag that Engineering can turn off in minutes without a deploy.
2. A named release owner is responsible for the change from the first customer exposure until it reaches everyone. The owner is a person, not a team, and is reachable for that whole period.
3. The rollback is written down and tested before release. The test is run by the engineer who is on call for the release, not only by the author.
4. No customer-visible release on a Friday, a weekend, or a public holiday.
5. Support is told what customers will see at least two business days before the first exposure.
6. A change may reach all customers at once only with the written approval of the Head of Payments Engineering, who records the reason.

## Releasing

Expose the change to internal accounts first and watch the send-failure dashboard for one hour. Then expose it to customers in steps that the release owner chooses and records. After each step, the owner checks the dashboard and the support queue before going further.

## Rollback

Turn the flag off first and investigate afterwards. If there is no flag, the release owner decides within 30 minutes whether to revert the deploy and informs the Head of Payments Engineering.

## Records

The release owner adds a line to the release log with the date, the change, the steps taken, and any rollback. The log is reviewed in the Monday engineering meeting.
`,
};

const v2: DocumentInput = {
  ...base, effectiveFrom: "2026-01-12",
  body: `## Purpose and scope

This procedure sets how a change reaches customers and when it must not. It exists because a send-path bug turns into invoices that never leave the building, late payments for our customers, and an immediate support spike for us.

It applies to every change to production that customers can notice: new features, changes to invoice sending, payments, tax or pricing logic, data migrations, and integrations. It does not apply to internal tooling, documentation, or changes behind an internal-only flag.

## Roles

| Role | Who | Responsibility |
|---|---|---|
| Release owner | A named engineer, normally the tech lead of the squad | Runs the rollout, decides each step, records the release |
| On-call engineer | The engineer on the billing rota for the period | Can run the rollback; reachable until the change reaches everyone |
| Support contact | A named person from Support | Receives the briefing and watches the queue |
| Approver | Head of Payments Engineering | Approves exceptions and changes near the billing run |

## Prerequisites

Do not expose the change to customers until all of these are true.

1. The change is behind a per-customer feature flag.
2. The flag-off rollback has been run in staging by the on-call engineer.
3. The stop conditions below are written into the release ticket.
4. Support has had a one-page briefing at least two business days earlier.
5. The release owner and the on-call engineer are named in the ticket.

## When not to release

Do not expose a change or move to the next step on a Friday, a weekend, a public holiday, or within three days before or after the 1st of the month, when the billing run happens. A change that has to ship in a blocked window needs the approver's written agreement.

## Rollout steps

1. Internal accounts. Hold for one hour.
2. 5% of customers, chosen for how quickly they report problems and not for how important they are. Hold for at least three business days.
3. 25% of customers. Hold for at least three business days.
4. All customers.

Never skip a step. A step may be repeated or reversed at any time. The release owner moves to the next step only after checking the send-failure dashboard and the support queue that morning.

## Stop conditions

Turn the flag off at once when the send-failure rate is above 0.5%, when more than five tickets about the change arrive in one day, or when an invoice is sent twice. Investigate afterwards.

## Weekend cover

A weekend on-call rotation covers billing from Friday 18:00 to Monday 09:00 UTC. The on-call engineer is paged when a scheduled invoice run stalls for more than 20 minutes or produces an abnormal number of invoices. The runbook for the five most common billing failures is linked from the release ticket.

## Records

The release owner records the date, the steps taken, the numbers at each step, and any rollback in the release log. A rollback gets a short review within five business days.
`,
};

const v3: DocumentInput = {
  ...base, effectiveFrom: "2026-02-01",
  body: `## Purpose and scope

This procedure sets how a change reaches customers, when it must not, and when to stop. Its aim is that a defect reaches a small, watched group of customers before it reaches all of them, and that someone who can reverse the change is always reachable.

### In scope

Every change to production that customers can notice: new features, changes to invoice sending, payments, tax or pricing logic, data migrations, integrations, and changes to the public API. Hotfixes follow this procedure with the shortened rollout described below.

### Out of scope

Internal tooling, documentation, and changes that are visible only to internal accounts. Infrastructure changes with no customer-visible effect follow the infrastructure change process.

### Definitions

| Term | Meaning |
|---|---|
| Exposure | Making a change available to a customer, even if they have not used it |
| Step | One stage of a rollout: internal, 5%, 25%, or all customers |
| Billing run | The scheduled run on the 1st of each month that generates recurring invoices |
| Quarter-close freeze | The last five business days of a quarter and the first three business days of the next |
| Stop condition | A measured level at which the release owner must turn the change off |

## Roles and responsibilities

| Role | Who | Responsibility |
|---|---|---|
| Release owner | A named engineer, normally the squad tech lead | Owns the change from first exposure until it reaches everyone; decides each step; records the release |
| On-call engineer | The engineer on the billing rota | Has run the rollback for this change; reachable until it reaches everyone |
| Support contact | A named person from Support, led by the Head of Support | Receives the briefing; watches the queue; passes on customer reports |
| Approver | Head of Payments Engineering | Approves exceptions, and changes to payments or the send path |
| Finance reviewer | VP Finance or the finance lead | Approves changes to tax, totals, or pricing logic near a quarter close |

## Prerequisites

Do not expose the change to any customer until each item is true and written in the release ticket.

1. The change is behind a per-customer feature flag that can be turned off without a deploy.
2. The flag-off rollback has been run in staging by the on-call engineer named in the ticket. A script that exists is not the same as an operator who can run it.
3. The stop conditions are written in the ticket and the dashboard that shows them is open.
4. Support has received a one-page briefing at least two business days before the first exposure. It says what customers will see, what is new, and what to do if a customer reports a problem.
5. For a scheduler or billing change, the change has been tested against billing days that are not the 1st, including the 29th to the 31st.
6. The release owner and the on-call engineer are named in the ticket and have confirmed they are available.

## Release calendar

| Window | Rule |
|---|---|
| Tuesday to Thursday, 09:00 to 15:00 UTC | Normal exposure window for first exposure and for each step |
| Monday | Exposure allowed only for a step that follows a hold that ended on the weekend |
| Friday, weekends, public holidays | No exposure and no new step |
| From three days before to three days after the 1st of the month | No exposure and no new step, because the billing run happens on the 1st |
| Quarter-close freeze | No change to tax, invoice totals, or payments without the approver and the finance reviewer both agreeing in writing |

A fixed marketing or conference date is a reason to cut scope or to announce that the feature is available to early customers now and to everyone later. It is not a reason to skip a step.

## Rollout steps

Each step has a hold. The hold is the minimum time the change must stay at that step with no stop condition reached. The release owner records the numbers at the start and end of each hold.

| Step | Exposure | Minimum hold | Move on only if |
|---|---|---|---|
| 1 | Internal accounts | 1 hour | Dashboard clean and no internal reports |
| 2 | 5% of customers | 3 business days | Send-failure rate below 0.5% and fewer than 5 related tickets on any day |
| 3 | 25% of customers | 3 business days | Same measures, and Support reports no new pattern |
| 4 | All customers | Watch for 5 business days | Release owner confirms in the ticket |

### Choosing the first cohort

The 5% step should be customers who asked for the feature and who have a named contact who answers support emails quickly. Problems should be reported, not silently endured. Do not choose a cohort for its importance.

### How to take a step

1. In the morning, open the send-failure dashboard and the support queue and note the numbers in the ticket.
2. Confirm the calendar allows an exposure today.
3. Raise the exposure in the flag system and note the time.
4. Check the dashboard 30 minutes later and again at the end of the working day.

## Stop conditions and rollback

| Condition | Action |
|---|---|
| Send-failure rate above 0.5% | Turn the flag off immediately |
| More than five tickets about the change in one day | Turn the flag off, then review the tickets |
| Any invoice or payment generated twice | Turn the flag off immediately and tell the approver |
| A customer reports changed totals on an invoice already sent | Turn the flag off immediately and tell the finance reviewer |
| The release owner or the on-call engineer becomes unreachable | Return to the previous step until they are reachable again |

Turn the flag off first and investigate afterwards. If the change has no flag, the release owner decides within 30 minutes whether to revert the deploy and tells the approver. A rollback is announced in the release channel with the time and the reason.

## Hotfixes

A hotfix still needs a release owner, an on-call engineer, a tested rollback, and the stop conditions. The rollout may start at 25% instead of 5%, with a hold of one business day. A hotfix to the send path or to payments needs the approver's agreement before exposure.

## Tax, totals, pricing and payment changes

Changes that alter amounts customers see or pay carry extra rules because an error reaches customers' own filings and bank accounts.

1. Compare old and new results for every invoice in scope, not a sample. A sample misses the rare invoices that matter most, such as invoices that straddle the date of a rule change.
2. Make rule changes date-aware. Never recalculate invoices that are already sent.
3. Run the new logic in shadow mode, writing results beside the live results without showing them to customers, and review every difference.
4. Keep a kill switch that can be turned off by the on-call engineer.
5. Do not ship the change when the finance reviewer is away. If a legal date fixes the deadline, widen the verification instead of narrowing it.

## Communication

Post in the release channel at the start of each step and at its end. Use the template below.

~~~
Release: {change name}
Owner: {name}   On call: {name}   Support contact: {name}
Step: {internal | 5% | 25% | all}   Time: {UTC time}
Numbers before: send-failure {x}%  tickets today {n}
Next review: {date and time}
~~~

When a rollback happens, add the reason and what customers may have seen.

## Records

The release owner closes the ticket with the date and time of each step, the numbers at each hold, any stop condition reached, and any customer impact. The record is kept in the release log. Every rollback gets a short review within five business days with the owner, the on-call engineer, and the approver. Lessons that change this procedure go to Platform Engineering for the next review.

## Exceptions

An exception to the calendar, the hold times, or the cohort steps needs written agreement from the approver. For changes to tax or totals it also needs the finance reviewer. The agreement states the reason, the customers affected, and what replaces the missing control. An exception is never granted for a marketing date or a revenue target alone.

## Escalation

If a stop condition is reached and the release owner cannot be reached within 15 minutes, the on-call engineer turns the flag off. If an issue is not contained within one hour, escalate to the Head of Payments Engineering. If customers outside the exposed group are affected, start the incident communication procedure.

## Review and related documents

Platform Engineering reviews this procedure every six months and after any rollback that reached customers. Related: Incident communication procedure, Customer data deletion procedure for changes that move customer data, and the Price change policy for changes to what customers pay.
`,
};

export const releaseVersions = [
  { changeNote: "First published after the recurring invoices launch: every customer-visible change needs a flag, a tested rollback, a named owner, and no Friday release.", input: v1 },
  { changeNote: "Added staged exposure (5%, 25%, all), stop conditions, a billing-run blackout, and weekend on-call cover after the weekend billing incidents.", input: v2 },
  { changeNote: "Added the quarter-close freeze and extra checks for tax, totals, pricing and payment changes after the tax cutover at quarter end; added roles, a calendar table, and escalation.", input: v3 },
];
