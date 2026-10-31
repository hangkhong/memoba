import type { DocumentInput } from "../../../src/modules/documents/schema";
import { wiki } from "../builders.ts";

// No seed case matches this document on purpose: it exercises answers that rest on process alone.
const current: DocumentInput = {
  title: "Customer data deletion procedure",
  description: "Use when a customer or a person whose data we hold asks for their personal data or their whole account to be deleted. It sets how to receive and verify the request, what to delete and where, what we must keep, and how to confirm.",
  type: "procedure", area: "Legal", owner: "Legal and Security", effectiveFrom: "2026-04-01",
  sources: [{ label: "Privacy operations", url: wiki("legal/privacy-operations") }],
  body: `## Purpose and scope

This procedure sets how Northwind Ledger handles a request to delete personal data or an entire account. Its purpose is that every request is logged, verified, completed within 30 days, and confirmed in writing, and that nothing is deleted for someone who is not entitled to ask.

### In scope

A request from an account owner to delete their account and the data in it. A request from a person, such as a customer's employee or a customer's own client, to delete personal data that we hold about them. A request that arrives through Support, Sales, the privacy mailbox, or a contract clause.

### Out of scope

A request to export data, which follows the data export guide. A request to correct data. A request from an authority or a court, which goes straight to Legal. Deleting data that a customer removes themselves in the product.

### Definitions

| Term | Meaning |
|---|---|
| Request | A written or spoken ask to delete personal data or an account |
| Requester | The person who asks |
| Account owner | The registered owner of a customer account |
| Verified request | A request whose requester has been confirmed as entitled to ask |
| Production deletion | Removal from the live database, analytics tools, and the support system |
| Retention exception | Data that we must keep for legal or tax reasons |
| Privacy tracker | The register of every request, owned by Legal and Security |

## Roles and responsibilities

| Role | Who | Responsibility |
|---|---|---|
| Intake | Whoever receives the request, usually Support | Logs the request the same day and starts verification |
| Privacy owner | Legal and Security | Owns the tracker, decides every exception, approves requests about third parties |
| Data engineer | A named engineer on the Platform squad | Runs the deletion in production and in analytics |
| Support lead | Head of Support | Removes the data from the support system and sends the confirmation |
| Finance | VP Finance | Confirms which invoices must be kept |

## Timeline

| Step | Owner | Time limit |
|---|---|---|
| Log the request in the privacy tracker | Intake | The day it arrives |
| Verify the requester | Intake and Privacy owner | 5 business days |
| Tell the requester what will be kept and why | Privacy owner | 10 days from the request |
| Delete from production, analytics and support | Data engineer and Support lead | 30 days from the verified request |
| Send written confirmation | Support lead | 2 business days after deletion |
| Escalate a risk to the 30-day limit | Whoever sees it | At day 20 |

## Steps

### 1. Receive and log

Log the request in the privacy tracker on the day it arrives. Record the date received, the channel, the requester's name and email, what they asked to be deleted, and the account if it is known. Do not delete anything yet. Reply within one business day to say that the request has been received and what happens next.

### 2. Verify the requester

For an account, the request must come from the account owner using the registered email address, or from someone the account owner has authorised in writing. Send a confirmation link to the registered address if the request came by another channel. For personal data of a third party, such as an employee of a customer, ask the Privacy owner before you proceed; the customer may be the right person to decide. Record how the requester was verified.

If verification is not complete after 5 business days, write to the requester once more, and then close the request as not verified if there is no answer after a further 10 days. Record the closure in the tracker.

### 3. Explain what will happen

Tell the requester in writing that deletion is permanent and cannot be undone. Tell them what we must keep and for how long, using the retention table below. Invite them to export anything they need first, and give them 10 days to do so unless they ask us to proceed at once.

### 4. Check for holds

Before deletion, the Privacy owner checks whether any of the following apply: an open dispute or legal claim, an active contract term that needs the data, an unpaid invoice, or a request from an authority. If a hold applies, the Privacy owner tells the requester and records the hold in the tracker. Deletion continues for data that is not under the hold.

### 5. Delete

The deletion is run by the data engineer for production and analytics, and by the Support lead for the support system. The steps are:

1. Delete the account, its users, its invoices that are not under retention, its attachments, and its API keys from the production database.
2. Remove the account and its people from analytics tools and from the data warehouse.
3. Delete the tickets, conversations and contact records from the support system, keeping only the ticket numbers needed for the retention exceptions.
4. Remove the account from marketing and email lists.
5. Revoke access tokens and integrations for the account.

Record each system, the time and the person who ran it in the tracker.

### 6. Backups

Backups age out on their normal schedule and are kept for at most 90 days. Backups are not restored for any reason other than disaster recovery. If a backup is restored, the data engineer repeats the deletion for every request that was completed after the backup was made, and the Privacy owner records that it was done.

### 7. Confirm

Within 2 business days of the end of the deletion, the Support lead sends the requester a written confirmation. It names what was deleted, what is retained and why, and when retained data will be removed. Record the completion date in the tracker and close the request.

## Retention exceptions

| Data | Why it is kept | How long | Who decides |
|---|---|---|---|
| Issued invoices and credit notes | Tax and accounting law | The period the law requires, then deleted | VP Finance |
| Payment records and refund references | Financial reporting and disputes | The period the law requires | VP Finance |
| Records of a legal claim or dispute | Defence of the claim | Until the claim ends | Privacy owner |
| The privacy tracker entry for the request | Proof that we handled the request | Three years, without the content of the data | Privacy owner |

Every exception is decided in writing by the person in the last column. Tell the requester what was kept and why.

## Escalation

If the 30-day limit is at risk, whoever sees it tells the Privacy owner at day 20. The Privacy owner decides within two business days whether to assign more help or to tell the requester about a delay and its reason. A request that involves a minor, an authority, a threat of legal action, or the data of many people goes to the Privacy owner at once.

## Checklist for each system

| System | What to remove | Who | Evidence kept in the tracker |
|---|---|---|---|
| Production database | Account, users, invoices not under retention, attachments, API keys | Data engineer | Query log and row counts before and after |
| Data warehouse and analytics | Rows and events for the account and its people | Data engineer | Job ID and completion time |
| Support system | Tickets, conversations, contact records | Support lead | Count of tickets removed and ticket numbers kept for retention |
| Email and marketing lists | Addresses and preferences | Support lead | Confirmation from the tool |
| File storage | Exports, uploads and generated PDFs | Data engineer | Bucket listing before and after |
| Third-party integrations | Tokens and webhooks for the account | Data engineer | List of revoked integrations |

## Requests about other people

A request from a customer's employee or from a customer's own client is about personal data that we hold on behalf of the customer. We do not decide alone.

1. The intake person logs the request and tells the requester that the customer controls the data and that we will pass the request on.
2. The Privacy owner contacts the account owner of the customer within two business days and shares the request.
3. If the customer asks us to delete, we proceed under this procedure for that person's data only.
4. If the customer refuses or does not answer within 10 business days, the Privacy owner tells the requester what we can and cannot do and records the decision.

## When not to proceed

Do not delete when the requester cannot be verified, when a hold applies to all of the data, when the request comes from someone who is not the account owner and the owner has not authorised it, or when the request is made by someone other than the data subject for a minor. Tell the requester why, in writing, and keep the request open in the tracker until the reason ends or the requester withdraws.

## Message templates

### Receipt

~~~
Thank you for your request. We received it on {date} and recorded it as {tracker ID}.
We will check that the request is from you. After that we will delete the data within 30 days and confirm in writing.
~~~

### Confirmation

~~~
We have completed your request {tracker ID} on {date}.
Deleted: {systems and data}.
Kept, and why: {data, legal reason, until when}.
Backups are removed within 90 days.
~~~

## Verification message

~~~
Hello {name},

We received your request to delete {account or personal data}. To protect your data we need to confirm that the request comes from you. Please click the link below from the email address registered on the account: {link}.

If you did not ask for this, do not click the link and reply to tell us.
~~~

## Message when we cannot proceed

~~~
Hello {name},

We cannot yet delete {account or personal data} because {reason in plain words}. What happens next: {what we need from you, or what we will do and when}. Your request {tracker ID} stays open.
~~~

## Records

The privacy tracker holds, for every request, the dates in the timeline, how the requester was verified, the exceptions and holds with the decision-maker, the systems the deletion ran in, and the confirmation. The Privacy owner reviews the tracker every quarter for late requests and for patterns.

## Review and related documents

Legal and Security review this procedure every six months and after any request completed late. Related: Production release procedure for changes that move customer data, and Incident communication procedure if data was deleted in error.
`,
};

export const deletionVersions = [
  { changeNote: "First published.", input: current },
];
