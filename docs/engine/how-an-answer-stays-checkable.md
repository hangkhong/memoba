# How an answer stays checkable

An answer about past work is only useful if you can verify it faster than you could have found it yourself. So Memoba treats every answer as a claim with its sources attached, and it is strict about what counts as a source.

The thinking here owes something to knowledge tools such as GBrain: where a fact came from matters as much as the fact. Memoba took that idea and built it into a web app with Postgres. It does not use GBrain's stack, and the chat agent does not traverse a knowledge graph.

## Seeing is not reading

The agent sees a lot and reads little. Search previews are short excerpts, and a document card is an outline. Neither can be cited.

A section earns a citation only when `read_case` or `read_document` delivers it during the run. At that moment the application creates a marker for it, such as `[S:run:12]`, tied to that run and that section. The model copies the marker next to the statement it supports. It can't make a valid marker up, because a marker exists only if the application issued it. Markers from an earlier run don't resolve, so old answers can't be recycled as evidence. Earlier assistant text in a conversation is context, and the agent must read a source again to rely on it.

<!-- diagram: seen-read-cited -->

## What gets checked after writing

When the draft is finished, [`validateTextAnswer`](../../src/modules/briefs/validation.ts) checks it:

1. Every marker matches a section disclosed in this run.
2. You are still allowed to read that source.
3. Citations sit under the right heading. "What the process says" may cite only documents, and "How similar cases went" may cite only cases.
4. The saved shape is valid.

If a citation fails, the model gets one chance to correct the draft within the same deadline. If it still fails, the run ends as failed. Memoba would rather show no answer than one with a broken source trail. The check also runs in the database, which verifies the saved evidence when the run finishes.

## Sources are frozen

Cases and documents change, so a citation has to survive that. Every edit makes a new immutable version. A run pins the version it read, and the answer saves a snapshot of the cited text with its case or document, version, and section.

Later you may open an old answer after the policy has moved on. The evidence panel still shows the text the answer relied on, and it says that a newer version exists. If a case was archived, new searches skip it, but authorized historical citations stay. Before any saved evidence is shown, access is checked again.

## "None" and "failed" are different answers

Each source reports its own state from the tool result: found, none, partial, failed, or repeat. The activity line under an answer is worded from those events, so it can say "3 cases found · no documents matched" without taking the model's word for it.

<!-- diagram: none-or-failed -->

| State | What the answer does |
|---|---|
| A successful search found no relevant case | Says no recorded case matched, and builds next steps from the process |
| A successful search found no relevant document | Says no process document matched, and labels process advice as general guidance |
| Neither source matched | Says so in the opening, and gives only a next step labelled as general guidance |
| A source failed or was only partly read | Says it could not check that source, and claims nothing about what it holds |

A run that ends without an answer stays visible as what it was: failed, cancelled, or timed out, with a way to try again.

## Advice is labelled as advice

Recorded outcomes and suggested steps sit under different headings. Unknown outcomes are stated as unknown. A generated answer never becomes a case, so the team's memory holds only what people recorded.

The activity view shows real tool events too. It doesn't narrate reasoning that nobody can verify.

## What a citation does not prove

A valid citation proves that the agent read that section. It does not prove that the section supports the sentence beside it, or that the advice fits your situation.

We could hide this behind a confidence score. We don't, because a score would be the model grading itself. What Memoba gives you is a cheap way to check: open the citation, read the section, judge. Measuring semantic support across many answers is [still open](../reference/evaluation.md#not-established).
