import type { DocumentInput } from "../../src/modules/documents/schema";
import { wiki } from "./builders.ts";

export type FixtureDocument = { slug: string; input: DocumentInput };

// Process documents for the demo company. Four overlap the seed cases; data deletion has no matching case on purpose.
export const demoDocuments: FixtureDocument[] = [
  {
    slug: "release-procedure",
    input: {
      title: "Production release procedure",
      description: "Use when shipping a feature, migration, or change that customers can feel to production. It sets how changes reach customers and when they may not ship.",
      type: "procedure", area: "Engineering", owner: "Platform Engineering", effectiveFrom: "2026-02-01",
      sources: [{ label: "Release handbook", url: wiki("engineering/release-handbook") }],
      body: `# Production release procedure

This procedure applies to every change to production that customers can notice: new features, pricing logic, data migrations, and integrations. Hotfixes follow it too, with the shortened rollout in the Rollback section.

## Before the release

1. Name one release owner and one on-call engineer for the whole rollout. Both must be reachable until the change is at 100% of customers.
2. Put the change behind a feature flag that can be turned off without a deploy.
3. Write the rollback step and test it in staging. A release without a tested rollback does not ship.
4. Check the release calendar. Do not ship on weekends, on public holidays, or during the quarter-close freeze (the last five business days of each quarter and the first three of the next) unless the CTO approves in writing.
5. Tell Support at least two business days ahead, with a short description of what customers will see.

## Rollout steps

1. Release to internal accounts and watch for one hour.
2. Release to 5% of customers who opted in to early access. Hold for one business day.
3. Release to 25% of customers. Hold for one business day.
4. Release to all customers. Never skip a step and never release to everyone at once.

A step may be repeated or reversed at any time. Moving to the next step needs the release owner to confirm that error rates, payment success, and support ticket volume are within the agreed thresholds.

## Monitoring and rollback

The release owner watches the release dashboard at each step. Roll back at once, by turning the flag off, if error rate doubles, payment success drops by more than one percentage point, or support receives more than ten tickets about the change in an hour.

For a hotfix the rollout may start at 25% instead of 5%, but the owner, the on-call engineer, and the tested rollback are still required.

## After the release

Record the release in the release log with the date, owner, steps taken, and any rollback. Review any rollback within five business days and add the lesson to the handbook.
`,
    },
  },
  {
    slug: "price-change-policy",
    input: {
      title: "Price change policy",
      description: "Use when planning any increase to the price of a plan, add-on, or fee that existing customers pay. It sets the notice period and who must approve.",
      type: "policy", area: "Finance", owner: "Finance and Legal", effectiveFrom: "2026-01-01",
      sources: [{ label: "Pricing governance", url: wiki("finance/pricing-governance") }],
      body: `# Price change policy

This policy applies to every increase of a price that existing customers pay, on any plan, add-on, usage tier, or fee. It does not apply to prices offered only to new customers.

## Notice

Customers must receive written notice at least 90 days before an increase takes effect. Notice is given by email to the account owner and by an in-app banner. The shorter notice period in the terms of service does not reduce this requirement.

A notice states the old price, the new price, the effective date, and the reason in plain language. It names where customers can ask questions.

## Protection for existing customers

Customers who are on a monthly or annual plan when notice is sent keep their current price for at least 12 months from the effective date. Moving them earlier needs written approval from the CFO and Legal.

## Approval

Every increase needs written approval from the CFO before notice is sent. Legal confirms that the contract terms allow the change. Finance records the approval, the notice date, and the effective date in the pricing log.

## Preparing support

Support receives a script and an FAQ at least two weeks before notice is sent. The owner of the change checks that the in-app banner and email are scheduled before approving the send.

## Exceptions

An exception to the notice period or to price protection needs written approval from the CFO and the General Counsel. The approval states the reason and the customers affected, and is kept in the pricing log. Exceptions are not granted for convenience or to meet a revenue date.
`,
    },
  },
  {
    slug: "incident-communication",
    input: {
      title: "Incident communication procedure",
      description: "Use during any outage or degradation that affects customers, and when preparing for one. It sets who speaks, how often, and where updates appear.",
      type: "procedure", area: "Operations", owner: "Customer Support", effectiveFrom: "2026-03-01",
      sources: [{ label: "Incident response guide", url: wiki("support/incident-response") }],
      body: `# Incident communication procedure

This procedure starts when an incident affects customers or is likely to. The incident commander owns communication until the incident is closed and may hand it to a named deputy.

## First thirty minutes

1. Open the status page entry within 30 minutes of detection, even if the cause is unknown. State what customers cannot do and that the team is investigating.
2. Post a short holding message in the support queue and the in-app banner, using the incident template.
3. Tell the customer-facing teams in the incident channel what customers have been told, so replies are consistent.

## Updates

Post an update every 30 minutes until the incident is resolved, even when nothing has changed. Each update says what is known, what is being done, and when the next update will be posted.

Reply to individual tickets with a link to the status page entry. Do not write separate explanations to individual customers while an incident is open.

## Escalation

If customer impact lasts more than 60 minutes, the incident commander informs the executive on call, who contacts affected enterprise accounts directly. Support leads report ticket volume to the incident channel hourly.

## After the incident

Close the status page entry with a plain summary of what happened and what customers should do. Publish a post-incident summary to affected customers within two business days. Record the timeline, ticket volume, and follow-up actions in the incident log.
`,
    },
  },
  {
    slug: "refunds-guideline",
    input: {
      title: "Refunds and duplicate charges guideline",
      description: "Use when a customer asks for a refund or reports being charged twice. It suggests how to confirm the charge, who reviews it, and how fast to resolve it.",
      type: "guideline", area: "Finance", owner: "Billing Operations", effectiveFrom: "2026-01-15",
      sources: [{ label: "Billing support playbook", url: wiki("finance/billing-support") }],
      body: `# Refunds and duplicate charges guideline

This guideline helps Support and Finance resolve refund requests and reports of duplicate charges. It is advisory: use judgment for unusual cases and note the reason when you depart from it.

## Confirm the charge

Check the payment processor record before replying. A duplicate charge means two successful captures for the same invoice. Two attempts where one failed is not a duplicate. Share the processor reference with the customer when you confirm.

## Review

Send suspected duplicates to Finance for review. Finance should answer within two business days. Refunds above 500 USD should also have a second reviewer in Finance.

## Resolving

Refund to the original payment method. Tell the customer the expected number of days for the money to arrive. Avoid offering a credit instead unless the customer asks for one.

## Patterns

If three or more customers report the same pattern in a week, raise it in the billing channel and ask Engineering to check for a systemic cause. Do not wait for each case to close first.

## Follow up

Close the ticket only after the refund has been confirmed by the processor. Add the ticket to the weekly billing review so recurring causes are found.
`,
    },
  },
  {
    slug: "data-deletion",
    input: {
      title: "Customer data deletion procedure",
      description: "Use when a customer asks for their personal or account data to be deleted. It sets how to verify the request, what to delete, and how to confirm.",
      type: "procedure", area: "Legal", owner: "Legal and Security", effectiveFrom: "2026-04-01",
      sources: [{ label: "Privacy operations", url: wiki("legal/privacy-operations") }],
      body: `# Customer data deletion procedure

This procedure applies when a customer or a person whose data we hold asks for deletion of personal data or of an entire account.

## Receive and verify

1. Log the request in the privacy tracker on the day it arrives, with the date received.
2. Verify the requester. For an account, the request must come from an account owner using the registered email. For personal data of a third party, ask Legal before proceeding.
3. Tell the requester that deletion is permanent and cannot be undone. Ask them to export anything they need first.

## Delete

1. Delete the account and personal data from the production database within 30 days of the verified request.
2. Remove the data from analytics tools and the support system.
3. Backups age out on their normal schedule. Backups are retained for at most 90 days and are not restored for any reason other than disaster recovery.

## Exceptions

Data we must keep for legal or tax reasons, such as invoices, is retained for the legally required period. Tell the requester what is kept and why. Legal decides every exception in writing.

## Confirm

Send the requester a written confirmation when deletion in production is complete, naming what was deleted and what is retained. Record the completion date in the privacy tracker. Escalate to Legal if the 30-day limit is at risk.
`,
    },
  },
];
