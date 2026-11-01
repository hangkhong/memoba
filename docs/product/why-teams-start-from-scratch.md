# Why teams start from scratch

A team gets a new request. Somebody has handled something like it before, maybe two years ago, maybe somebody who has since left. The most useful thing to know now is how those earlier cases went and what is different this time. Finding that out means asking around or digging through old folders, so most people skip it and start fresh.

That is usually called a storage problem. It is a cost problem.

## Finding costs more than redoing

Compare the two choices from the point of view of the person holding the request.

Starting fresh has a cost you can see. You know what the first step is, and it feels like progress. Looking for past work has a cost you cannot see. You don't know whether anything exists, who to ask, or which of 40 files matters, and you may spend an afternoon and find nothing. Under a deadline, skipping the search is the sensible choice.

So a bigger archive does not help. The past work is already stored, and the search still loses. A tool changes behavior only when asking it costs less than not asking. Everything else in Memoba follows from that sentence.

## What survives is the wrong part

There is a second problem, and it is quieter. Even when you find the old work, the part you need is often gone.

Take a launch in the demo workspace. The ticket says "Recurring invoices. Done." The recorded case behind it says much more:

- The conditions: no feature flag, no rollback rehearsal, a Friday afternoon release.
- The road not taken: a 5% start was discussed and rejected because of a keynote date.
- What really happened: about 900 duplicate invoices for roughly 70 customers.
- What to do next time: a fixed date is a reason to cut scope, not to skip a staged rollout.

The ticket records that work finished. The next person needs to know why it went the way it did. Folders keep the deliverable and lose the reasoning, and the reasoning is what makes past work reusable.

(Northwind Ledger, the company in the demo, is fictional.)

## What a reuse tool has to do

Those two problems set three requirements. A tool that misses any of them gets abandoned, however good its search is.

**It must cost less than starting over.** You ask in your own words. There is no form to fill in, no taxonomy to learn, and no need to know that a relevant case exists.

**It must bring back the outcome and the conditions, not the file.** A link to a document leaves the reading to you. The value is in "this approach failed under these conditions, and yours are different in this way".

**It must be reliable in a way you can check.** "Reliable" means two things here: you can see where each statement came from, and the tool says so when it does not know. It does not mean always right. One invented precedent is enough for people to stop asking, because after that every answer has to be verified by hand, and the tool costs more than it saves.

[What Memoba believes](what-memoba-believes.md) turns these requirements into a product.
