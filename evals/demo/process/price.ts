import type { DocumentInput } from "../../../src/modules/documents/schema";
import { wiki } from "../builders.ts";

type Base = Pick<DocumentInput, "title" | "description" | "type" | "area" | "owner" | "sources">;
const base: Base = {
  title: "Price change policy",
  description: "Use when planning any increase to the price of a plan, add-on, usage tier, or fee that existing customers pay. It sets the notice period, price protection, who must approve, and how exceptions are granted.",
  type: "policy", area: "Finance", owner: "Finance and Legal",
  sources: [{ label: "Pricing governance", url: wiki("finance/pricing-governance") }],
};

const v1: DocumentInput = {
  ...base, effectiveFrom: "2025-10-06",
  body: `## Purpose and scope

This policy sets the minimum rules for raising a price that existing customers pay. It was written after the Pro plan increase of 22 August, which gave customers ten days of notice, was applied to annual contracts without checking their terms, and was reversed for about 280 accounts.

It applies to every increase on a plan, add-on, usage tier, or fee that existing customers pay. It does not apply to prices offered only to new customers.

## Notice

Customers must receive written notice of an increase at least 30 days before it takes effect, and no less than the notice their contract requires. Notice goes by email to the account owner and by an in-app banner. The longer of the two periods applies.

## Contract check

Before an effective date is chosen, Finance reads the notice terms of every plan and contract that the increase touches. Annual contracts often set their own notice period. The effective date for each group is the later of the date this policy requires and the date the contract allows.

## Explanation and briefing

The notice states the old price, the new price, the effective date, and the reason in plain language. Account executives and Support are briefed before the notice is sent, with answers to the likely questions.

## Approval and records

The VP Finance approves every increase in writing before notice is sent. Finance records the approval, the notice date, the effective date, and the contract check in the pricing log.

## Exceptions

An exception to the notice period needs the written agreement of the VP Finance and Legal. It is not granted to meet a quarterly revenue target.
`,
};

const v2: DocumentInput = {
  ...base, effectiveFrom: "2026-01-01",
  body: `## Purpose and scope

This policy sets what must happen before and after the price of anything that existing customers pay goes up. Its purpose is to protect customer trust and our contracts, and to make sure Finance, Legal, Support and Sales hear about an increase before customers do.

### In scope

Any increase to the price of a plan, add-on, usage tier, or fee paid by customers who are already subscribed, on any billing term. A change to what a plan includes that has the same effect as a price increase, such as removing a feature from a plan, is treated as an increase.

### Out of scope

Prices offered only to new customers, promotional discounts that end on a stated date, and decreases. Currency conversion changes follow the Treasury procedure.

### Definitions

| Term | Meaning |
|---|---|
| Notice | A written message to the account owner that states the increase and its effective date |
| Effective date | The first billing date on which the new price applies to an existing customer |
| Price protection | A period in which an existing customer keeps the price they had when notice was sent |
| Contract customer | A customer on an annual or custom contract that sets its own notice or price terms |
| Pricing log | The register kept by Finance of every increase, approval, and exception |

## Roles and responsibilities

| Role | Who | Responsibility |
|---|---|---|
| Change owner | Product manager responsible for pricing | Prepares the proposal, the notice, and the support material |
| Finance approver | VP Finance | Approves the increase and any exception in writing |
| Legal | Legal Counsel | Confirms the contract terms allow the change and the date |
| Support lead | Head of Support | Receives the script and FAQ and plans for ticket volume |
| Account executives | Sales | Are briefed before notice and contact contract customers |

## Notice

Customers must receive written notice at least 90 days before an increase takes effect. This applies to every customer group, including monthly-billed customers whose terms of service would allow a shorter period. If a contract requires more than 90 days, the contract period applies.

### What the notice contains

1. The old price, the new price, and the effective date.
2. The reason for the increase, in plain language and without jargon.
3. The price protection that applies to the customer, if any.
4. Where to ask questions and who will answer.

### How notice is sent

Notice goes by email to the account owner and by an in-app banner from the day of the email until the effective date. Account executives also contact contract customers directly on the day notice is sent. Notice is not given by a change in the price list alone.

## Price protection

A customer who is subscribed on the day notice is sent keeps the price they have for at least 12 months after the effective date. The new price applies from the effective date to customers who sign up after notice is sent. Shortening or removing price protection for a group needs the written approval of the VP Finance and Legal.

## Approval

An increase is approved before anything is sent. The change owner submits the proposal, and the sequence is:

1. The change owner sends the proposal to the VP Finance with the groups affected, the old and new prices, the proposed effective date, the expected revenue and when it arrives, and the expected effect on cancellations.
2. Legal confirms the contract terms for every group affected and the earliest allowed effective date. The effective date is never earlier than 90 days after the notice date.
3. The VP Finance approves in writing, or returns the proposal with reasons.
4. Finance records the approval in the pricing log.

## Preparing Support and Sales

Support receives a script and answers to the five most likely questions at least two weeks before notice is sent. The Support lead confirms in writing that the usual ticket volume can absorb the increase without extra staff, or names the extra cover. Account executives receive the list of contract customers in their book, the notice text, and the date.

## Checklist before notice is sent

- [ ] Approval from the VP Finance is in the pricing log.
- [ ] Legal has confirmed the contract terms and the effective date.
- [ ] The effective date is at least 90 days after the notice date.
- [ ] Price protection for existing customers is stated in the notice.
- [ ] Support has the script and FAQ, and two weeks have passed.
- [ ] Account executives have the list of contract customers.
- [ ] The email and the in-app banner are scheduled.

## After notice

Support reports ticket volume and cancellation requests for the affected plan to Finance every week for eight weeks. If cancellations exceed the agreed level, the change owner and the VP Finance meet within three business days to decide whether to adjust the plan within this policy. They do not shorten notice or protection that customers have already been given.

## Timeline for a typical increase

The dates below show the earliest a typical increase can take effect. Day 0 is the day notice is sent.

| Day | What happens | Owner |
|---|---|---|
| -30 | Proposal sent to the VP Finance with groups, prices and expected revenue | Change owner |
| -21 | Legal confirms contract terms and the earliest allowed effective date | Legal |
| -14 | Support receives the script and FAQ; account executives receive the list of contract customers | Change owner |
| -3 | Approval recorded in the pricing log; email and banner scheduled | VP Finance and change owner |
| 0 | Notice emailed and banner live; account executives contact contract customers | Change owner and Sales |
| 7, 14, 28, 56 | Ticket volume and cancellation requests reported to Finance | Support lead |
| 90 | Earliest effective date; new price applies to new sign-ups from day 0 and to existing customers from this date | Finance |
| 90 + 12 months | Price protection for customers subscribed on day 0 ends | Finance |

## Groups with special terms

| Group | What to check | Rule |
|---|---|---|
| Monthly-billed small customers | Standard terms of service | Standard notice of 90 days and 12 months of price protection; the terms of service do not shorten it |
| Annual contract customers | The notice and price clauses of each contract | The later of 90 days and the contract period; the increase applies at renewal unless the contract says otherwise |
| Custom or negotiated contracts | The signed order form | Legal reads each one; the account executive contacts the customer before notice |
| Customers on a promotion | The end date of the promotion | The increase does not apply until the promotion has ended and notice has been given |
| Customers in a free trial | Not subscribed on day 0 | They pay the new price when they convert |

## Notice templates

### Email to the account owner

~~~
Subject: A change to the price of your {plan} plan from {effective date}

Hello {name},

From {effective date}, the price of the {plan} plan will change from {old price} to {new price} per {period}.

Why: {one or two plain sentences about the cost that has increased, for example hosting, payment processing, or support}.

What this means for you: {price protection statement, for example: you keep your current price until {protection end date}}.

If you have questions, reply to this email or write to {contact}. {Account executive name} will also be in touch if your account has a contract.

The Northwind Ledger team
~~~

### In-app banner

~~~
The price of {plan} changes on {effective date}. {Protection statement}. See what is changing: {link}
~~~

## Answers for Support

Support receives the answers to these questions at least two weeks before notice.

1. Why is the price changing? Give the reason written in the notice, and no other.
2. When does it apply to me? Give the effective date and the price protection end date for the plan.
3. Can I stay on my current price? Explain the price protection that applies. Do not offer a different arrangement; send the question to the change owner.
4. Can I cancel? Yes, under the usual terms. Tell the customer how and do not argue; record the reason in the ticket.
5. My contract says something different. Do not answer; send the ticket to the account executive and the change owner the same day.

## Exceptions

An exception to the notice period or to price protection needs the written approval of the VP Finance and the CEO, and Legal's confirmation of the contract position. The request states the reason, the customers affected, and what replaces the missing protection. It is recorded in the pricing log. An exception is not granted for convenience, to meet a quarterly revenue target, or because a customer group is small.

## Records and review

Finance keeps the pricing log: for every increase the approval, notice date, effective date, contract check, customers affected, and any exception. Finance and Legal review this policy every six months and after any increase that was reversed or that led to complaints about notice.

## Related documents

Production release procedure for the release of a new price in the product, Incident communication procedure for reaching customers when billing is affected, and Refunds and duplicate charges guideline for customers who were charged the wrong price.
`,
};

export const priceVersions = [
  { changeNote: "First published after the Pro plan increase with ten days of notice was reversed for annual contracts: 30 days minimum, contract check before the effective date, Finance approval.", input: v1 },
  { changeNote: "Notice raised from 30 to 90 days for every customer group, 12 months of price protection added, approval and exception rules tightened, and roles, checklist and after-notice monitoring added.", input: v2 },
];
