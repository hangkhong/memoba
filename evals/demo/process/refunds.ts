import type { DocumentInput } from "../../../src/modules/documents/schema";
import { wiki } from "../builders.ts";

type Base = Pick<DocumentInput, "title" | "description" | "type" | "area" | "owner" | "sources">;
const base: Base = {
  title: "Refunds and duplicate charges guideline",
  description: "Use when a customer or a customer's client asks for a refund or reports being charged twice for one invoice. It suggests how to confirm the charge, who reviews it, how fast to resolve it, and what to tell the customer.",
  type: "guideline", area: "Finance", owner: "Billing Operations",
  sources: [{ label: "Billing support playbook", url: wiki("finance/billing-support") }],
};

const v1: DocumentInput = {
  ...base, effectiveFrom: "2026-01-15",
  body: `## Purpose and scope

This guideline helps Support and Finance resolve duplicate-charge reports and refund requests quickly and correctly. Before it, tickets moved back and forth between the two teams with no shared reference and the average refund took nine days.

It is advisory. Use judgment in unusual cases and note the reason in the ticket when you depart from it.

## Collect the facts

Support records the following in the standard ticket form before the ticket goes to Finance: the invoice ID, both charge IDs from the payment page, the date and amount of each charge, and the customer's message.

## Confirm

Finance confirms in the gateway whether the second charge is a duplicate of the first. A duplicate is two successful captures for one invoice. Two attempts where one failed is not a duplicate, and two payments for two different invoices are not a duplicate. Finance adds the confirmation to the ticket.

## Refund

Finance issues the refund within two business days of receiving a complete ticket and adds the refund reference to it. Refunds go back to the original payment method.

## Approval

Refunds above 500 dollars go to the finance lead, who decides on the same day.

## Tell the customer

Support sends a message that states the refund reference and the expected settlement date. Support does not ask Finance for gateway access.
`,
};

const v2: DocumentInput = {
  ...base, effectiveFrom: "2026-07-06",
  body: `## Purpose and scope

This guideline helps Support and Finance resolve duplicate-charge reports and refund requests quickly and correctly, and keeps the two teams working from one reference. After two quarters of use the median time to refund fell from nine days to two.

It is advisory: use judgment for unusual cases and write the reason in the ticket when you depart from it. A refund promised in writing by an executive follows the executive's instruction, and Finance still records it.

### In scope

Refund requests for a card payment made through the gateway, and reports of a double charge for one invoice, from our customers or from their clients.

### Out of scope

Price disputes and billing at the wrong price, which go to the change owner for the plan. Chargebacks started with the bank follow the chargeback process.

### Definitions

| Term | Meaning |
|---|---|
| Duplicate charge | Two successful captures for the same invoice |
| Separate payment | Two valid payments for different invoices or for a deliberate second payment |
| Failed attempt | A charge that the gateway declined or reversed; not a duplicate |
| Refund reference | The gateway's ID for the refund, copied into the ticket |
| Settlement date | The date the refund is expected to reach the customer's account |

## Roles and responsibilities

| Role | Who | Responsibility |
|---|---|---|
| Support agent | Any agent in the Support team | Collects the facts, fills the form, and tells the customer |
| Finance analyst | Finance, for example Mei Tanaka | Confirms the charge in the gateway and issues the refund |
| Finance lead | VP Finance | Decides refunds above 500 dollars and disputed invoices |
| Head of Support | Hana Lindqvist | Resolves tickets that are still open after two business days |
| Engineering contact | Payments Engineering | Receives confirmed duplicates to fix their cause |

## Step by step

### 1. Collect the facts

Support fills the standard ticket form with the invoice ID, both charge IDs, the date and amount of each charge, and the customer's own message. A ticket that lacks these goes back to Support the same day; it does not wait in Finance.

### 2. Confirm in the gateway

Finance confirms whether the second charge is a duplicate. Look at the invoice ID, the amount, the capture time of each charge, and whether one of them was reversed. Two payments for two invoices are separate payments. Write the result in the ticket as duplicate, separate payment, or failed attempt, with the gateway reference.

### 3. Refund

For a confirmed duplicate Finance issues the refund within two business days of receiving a complete ticket. Refund to the original payment method. Offer a credit only if the customer asks for one. Add the refund reference to the ticket.

### 4. Tell the customer

Support sends a message the same day, with the refund reference and the expected settlement date. Use the reply below.

~~~
Hello {name}, we confirmed that invoice {invoice ID} was charged twice. We have refunded {amount} to your original payment method. The reference is {refund reference}. The money should arrive by {settlement date}. We are sorry for the trouble.
~~~

When the second payment was a legitimate separate payment, say so and show both invoices; do not refund.

## Decision thresholds

| Amount of the refund | Who decides | Time to decide |
|---|---|---|
| Up to 500 dollars | Finance analyst | Within two business days |
| Above 500 dollars | Finance lead | Same day, after the analyst confirms |
| Any invoice the customer disputes | Finance lead | Within two business days |
| Any case open after two business days | Head of Support | The next business day |

## Refunds that are not duplicates

A request for a refund that is not a duplicate charge is a judgment call. Use the table as a starting point and decide on the merits.

| Situation | Suggested handling | Who decides |
|---|---|---|
| The customer was charged after cancelling in time | Refund the charge in full | Finance analyst |
| The customer was charged for a plan they did not choose, with evidence | Refund the difference and correct the plan | Finance analyst |
| The customer asks for a refund within 14 days of a first payment and has not used the product | Refund in full | Finance analyst |
| The customer asks for a refund of a month already used | Offer a credit for the next invoice; refund only if the customer insists and the finance lead agrees | Finance lead |
| The charge followed an outage that affected the customer | Follow the service credit rules in the Incident communication procedure; do not refund inside the ticket | VP Finance and Head of Support |
| The customer says they did not authorise the charge | Do not refund; follow the chargeback process and tell the customer what to expect | Finance lead |

## How long a refund takes

The gateway sends a refund within one business day of Finance issuing it. The money reaches the customer's account after the bank processes it. Tell customers to expect the range below and give the settlement date from the gateway when it shows one.

| Payment method | Usual time for the money to arrive |
|---|---|
| Credit card | 5 to 10 business days |
| Debit card | 5 to 10 business days |
| Bank transfer | 3 to 5 business days |
| Wallet payments | 1 to 3 business days |

## Messages

### A separate payment, not a duplicate

~~~
Hello {name}, we checked the two charges you asked about. They are for two different invoices: {invoice A} for {amount A} on {date A} and {invoice B} for {amount B} on {date B}. Both payments are valid, so we have not refunded either one. If you think one of them is wrong, reply with the invoice you expected and we will look again.
~~~

### More information needed

~~~
Hello {name}, to check the charges we need the invoice number and the date of each charge, or a screenshot of your bank statement. Reply with them and we will answer within two business days.
~~~

## Patterns

If three or more customers report the same pattern in one week, Support raises it in the billing channel and Finance asks Payments Engineering to look for a systemic cause. Do not wait for each ticket to close. Finance sends the list of confirmed duplicates to the Engineering contact every month, so the cause can be fixed: before this was done about 40 duplicates a month were still being generated by the gateway retry.

## What not to do

Do not give Support access to the gateway. Do not refund a second charge automatically within minutes; it risks refunding a legitimate separate payment. Do not close the ticket until the processor confirms the refund.

## Records

The ticket keeps the form, the gateway result, the refund reference, and the dates. Finance reviews the duplicate-charge tickets in the weekly billing review for recurring causes and records the median time to refund each quarter.

## Review and related documents

Billing Operations reviews this guideline every six months. Related: Incident communication procedure when duplicates come from an outage, and Price change policy when the complaint is about a price.
`,
};

export const refundsVersions = [
  { changeNote: "First published: a standard ticket form, Finance confirms in the gateway, refund within two business days, and the finance lead decides refunds above 500 dollars the same day.", input: v1 },
  { changeNote: "Added roles, decision thresholds, a customer reply, and a monthly list of confirmed duplicates for Engineering after two quarters showed the retry bug still generated about 40 duplicates a month.", input: v2 },
];
