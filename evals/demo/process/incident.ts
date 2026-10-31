import type { DocumentInput } from "../../../src/modules/documents/schema";
import { wiki } from "../builders.ts";

type Base = Pick<DocumentInput, "title" | "description" | "type" | "area" | "owner" | "sources">;
const base: Base = {
  title: "Incident communication procedure",
  description: "Use during any outage or degradation that affects customers, and when preparing for one. It says who leads, how fast the first message goes out, how often updates follow, what to tell customers and account executives, and what to publish afterwards.",
  type: "procedure", area: "Operations", owner: "Customer Support",
  sources: [{ label: "Incident response guide", url: wiki("support/incident-response") }],
};

const v1: DocumentInput = {
  ...base, effectiveFrom: "2025-12-01",
  body: `## Purpose and scope

This procedure sets how we talk to customers during an incident. It was written after the November payment gateway outage, where we replied to tickets one by one, posted nothing publicly, and received over 600 tickets, many of them from customers asking again after an hour of silence.

It applies to any incident that blocks or degrades something customers do: sending invoices, accepting payments, signing in, or using the API.

## The incident lead

The first person to confirm an incident names an incident lead within 15 minutes. The lead comes from the incident rota across Support and Engineering. The lead owns every message to customers until the incident is closed and has the authority to publish without further approval.

Engineers do not answer tickets. They work on the cause, with the provider where there is one.

## First message

Within 15 minutes of the first customer report, the incident lead publishes an entry on the public status page. Publish even when the cause and the time to fix are unknown. Say what customers cannot do and that we are working on it.

## Updates

Update the status page every 30 minutes until the incident is resolved, even when the update says that nothing has changed. Support agents reply to tickets with a short message that points to the status page.

## Email

Send one email to customers who were affected, linking to the status page. Do not send more email for the sake of activity.

## Escalation

If customer impact lasts more than 60 minutes, the incident lead tells the Head of Support, who informs the executive team and the account executives of affected enterprise accounts.

## After the incident

Close the status page entry with a plain summary. Hold a 20-minute review within two business days and record what to change.
`,
};

const v2: DocumentInput = {
  ...base, effectiveFrom: "2026-04-01",
  body: `## Purpose and scope

This procedure sets how we communicate with customers, account executives and leadership during an incident, and what we publish afterwards. Its purpose is that customers always know that we know, what they can and cannot do, and when they will hear from us next.

### In scope

Any incident that blocks or degrades something customers do: sending or receiving invoices, accepting card payments, signing in, importing data, or using the API. It also covers incidents at a provider that affect our customers, such as the payment gateway.

### Out of scope

Security incidents involving personal data follow the security incident process, which adds legal notification duties; this procedure still applies to the customer messages around them. Planned maintenance follows the maintenance notice template in the status page tool.

### Definitions

| Term | Meaning |
|---|---|
| Incident | An event that stops or degrades something customers do |
| Incident lead | The person who owns all communication until the incident is closed |
| Technical contact | The engineer who works with the cause, and with the provider if there is one |
| Status page | The public page where every incident is published |
| Severity | How many customers and which functions are affected; see the table below |

## Roles and responsibilities

| Role | Who | Responsibility |
|---|---|---|
| Incident lead | The person on the incident rota across Support and Engineering | Publishes every update, owns the communication log, decides what is said |
| Technical contact | An engineer, for example the tech lead of the affected squad | Diagnoses and fixes; tells the lead what is known; does not answer tickets |
| Support lead | Head of Support | Staffs the queue, owns the template replies, reports ticket volume hourly |
| Account owner contacts | Account executives | Contact their affected enterprise accounts using the message from the lead |
| Executive on call | A member of the leadership team | Informed at 60 minutes; speaks to customers who ask for an executive |

## Severity

| Severity | When | First status page entry | Update interval | Executive informed |
|---|---|---|---|---|
| 1 | A core function is down for all or most customers | 15 minutes | 30 minutes | At once |
| 2 | A core function is degraded or down for a group of customers | 15 minutes | 30 minutes | At 60 minutes |
| 3 | A minor function is affected | 60 minutes | 2 hours | Not needed |

If you are not sure, choose the higher severity and lower it later. The lead may change severity and records the time.

## The first 30 minutes

1. Within 15 minutes of the first confirmed customer report, name the incident lead. Write the name in the incident channel.
2. The lead publishes the first status page entry within 15 minutes of that report. State what customers cannot do. State that we are working on it. State when the next update will come. Do not state a cause or an estimate that is not confirmed.
3. The lead posts the same message in the in-app banner if customers can still sign in.
4. The Support lead switches the queue to the template reply, which points to the status page and contains no cause.
5. Engineers stay out of the support queue. The technical contact works with the provider and reports to the lead in the incident channel.
6. The lead tells the account executives which enterprise accounts are affected and gives them one line they can forward.

## Updates

Publish an update every 30 minutes until the incident is resolved, even when it says that nothing has changed. Each update says what is known, what is being done, and when the next update will be posted. A fixed rhythm calms customers more than technical detail.

Do not give an estimated time to fix until the technical contact and the provider both confirm it. If an estimate changes, say so plainly.

## Template messages

### First status page entry

~~~
We are investigating a problem with {function}. Customers cannot {what they cannot do}.
Other parts of {product} are working normally.
We will post our next update by {time, UTC}.
~~~

### Update with no news

~~~
Update {time, UTC}: our team and {provider, if any} are still working on {function}. We have no new information.
Next update by {time, UTC}.
~~~

### Recovery

~~~
Update {time, UTC}: {function} is working again. {What happens automatically, for example: failed payments will be retried automatically within {n} hours; no action is needed.}
If you still see a problem, reply to this email or contact support.
~~~

### Ticket reply

~~~
Thanks for getting in touch. We know about the problem with {function} and our team is working on it.
The latest information is always at {status page link}. We will not close this ticket until it is resolved.
~~~

## Incidents at a provider

When the cause is at a provider, such as the payment gateway, say so plainly and do not blame the provider by name unless the provider has said so publicly. Customers care what they can do and when it will be fixed, not whose fault it is. The technical contact asks the provider for updates every 30 minutes and tells the lead what has been confirmed. Where the provider has a public status page, link to our own page only; customers do not read the provider's page.

## Examples

| Example | Severity | Why |
|---|---|---|
| Card payments cannot be authorised for all customers | 1 | A core function is down for everyone |
| Invoices are sent late for customers in one region | 2 | A core function is degraded for a group |
| Importing a spreadsheet fails for large files | 3 | A minor function is affected |
| The status page itself is unavailable | 2 | Customers cannot see updates; use email and the in-app banner |
| A release causes duplicate invoices | 1 | Customers receive wrong documents; also follow the Production release procedure |

## Message to account executives

~~~
Subject: Incident {severity}: {function}, {time UTC}

Affected accounts: {list}
What customers see: {one sentence}
What we are doing: {one sentence}
Next update: {time UTC}, on {status page link}
You can forward this note to your customers. Please do not promise a credit or a time to fix.
~~~

## Message to leadership

~~~
Incident {severity} since {time UTC}: {function}. Customers affected: {number or group}. Tickets so far: {n}. First response time: {minutes}.
Cause known: {yes/no}. Provider involved: {name or none}. Next update: {time UTC}.
Needed from you: {decision or contact, or none}.
~~~

## Handover

An incident that lasts more than four hours changes lead. The new lead reads the communication log, confirms the next update time in the incident channel, and takes over at a time stated in the log. The previous lead stays reachable for one hour. The log shows every message sent, the time, and who sent it.

## Email

Send one email to the customers who were affected, such as those who accepted card payments in the last 24 hours, when the first status page entry is published. Link to the status page. Send a second email when the incident is resolved if payments or documents need customer action. Do not send repeated email in between.

## Escalation

| Time since the first report | Action |
|---|---|
| 15 minutes | Incident lead named and first entry published |
| 60 minutes | Incident lead informs the Head of Support and the executive on call; the executive contacts affected enterprise accounts through their account executives |
| 4 hours | Executive team decides whether to offer service credits and who approves them |
| End of incident | Incident lead closes the entry and starts the review |

## Service credits

Credits for an outage are decided by the VP Finance and the Head of Support after the incident, using the contract terms. Do not promise a credit during the incident.

## After the incident

1. Close the status page entry with a short, plain summary of what happened and what customers should do.
2. Within two business days, send a post-incident summary to affected customers. It says what happened, what we have changed, and where to ask questions.
3. Hold a 20-minute review within two business days with the lead, the technical contact, and the Head of Support.
4. Record the timeline, ticket volume, first-response time, and the follow-up actions in the incident log.
5. Fix the template replies the next day if the review shows a gap.

## Rehearsal

Once a quarter the incident lead rota rehearses this procedure for 30 minutes: name a lead, publish a test entry on the staging status page, and send a template reply. A procedure that is used for the first time during a real incident fails.

## Records

The incident log keeps the severity, the time of each message, the ticket count, the first-response time, any escalations, and the actions from the review. The Head of Support reviews the log each quarter.

## Review and related documents

The Head of Support reviews this procedure every six months and after any incident of severity 1. Related: Production release procedure for a rollback that causes an incident, and Refunds and duplicate charges guideline for customers who were charged wrongly during an incident.
`,
};

export const incidentVersions = [
  { changeNote: "First published after the November payment gateway outage: a named incident lead, a status page entry within 15 minutes, updates every 30 minutes, and one email.", input: v1 },
  { changeNote: "Added severity levels, an escalation timetable, template messages including what happens automatically after recovery, service credit rules, and a quarterly rehearsal after the March outage showed gaps in the templates.", input: v2 },
];
