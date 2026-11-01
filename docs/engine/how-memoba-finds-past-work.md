# How Memoba finds past work

People describe the same past work in different words. The person who ran a project wrote "staged rollout". The person asking today writes "release it slowly to customers". They also use exact names that only match themselves, such as a vendor, a product, or a plan name. Memoba searches in two ways because each one fails where the other works.

## Keyword search finds the exact thing

Keyword search matches the words themselves. It is the right tool for "NetSuite" or "SOC 2". A name like that has one meaning, and a close match is no use. It also ranks a passage that mentions the term often and close together above one that mentions it once.

Its weakness is that it only sees spelling. Memoba uses the Postgres `simple` text configuration, which does not reduce words to a root and has no list of synonyms. "Launch" does not match "launches", and "cancel" does not match "churn".

If you know BM25, the standard ranking method for keyword search, the idea is the same family. Memoba does not implement BM25. It ranks with `ts_rank_cd`, which comes with Postgres, because that was enough for this corpus and needed no extra search service.

## Search by meaning finds the similar thing

Search by meaning turns text into a list of numbers, called an embedding, so that passages about similar ideas sit near each other. A question about "customers threatening to leave" can find a case about "saving an at-risk renewal" with no words in common.

Its weakness is the reverse. It is vague about exact terms, and it always returns something nearby. Memoba discards anything past a distance cutoff, but even so "nearby" does not mean "relevant". The Singapore data center question found two neighboring cases that had nothing to do with it. Two found cases, none relevant.

## Combining them by rank

The two searches produce scores on different scales, so the scores can't be added. Memoba uses reciprocal rank fusion, which ignores the scores and looks only at positions. A section near the top of either list does well. A section near the top of both does best.

<!-- diagram: two-searches -->

This has a useful effect. An exact match that search by meaning misses still gets in, and a paraphrase that keyword search misses still gets in. Neither method needs tuning against the other.

The ranking lives in SQL: [`search_knowledge`](../../supabase/migrations/202610300002_search_diversity.sql) for cases and [`search_knowledge_documents`](../../supabase/migrations/20261031010000_process_documents.sql) for documents. Both search only active, published sources in your workspace, indexed with the current embedding model.

## Keeping results from crowding each other out

Search runs over sections, not whole cases. Left alone, one long case could fill every slot with its own sections and hide the rest. So search returns at most two sections per case, which spreads the results across more cases.

Documents work differently, because they are long and match many topics through some block. A document is ranked by its best section and comes back as one card, with its title, description, type, owner, effective date, an outline of numbered blocks, and the headings that matched. The agent can then read only the blocks that matter.

## A search result is a candidate

Neither a case preview nor a document card is evidence. Previews are short and can be misleading, so they help the agent choose what to open and can't be cited. [How an answer stays checkable](how-an-answer-stays-checkable.md) explains why that line matters.

This is also why the agent treats ranking as a starting point. Precision is its job: it reads the titles, outcomes, and matched headings, ignores what doesn't apply, and searches again if the results are thin or one-sided.

## When search fails

One question produces one embedding, then two searches that finish separately. If the document search fails, the case results still stand, and the failure is reported for documents only.

If the embedding itself fails, both sources report an error. Memoba could fall back to keyword search alone, and it deliberately doesn't. A silent downgrade would return thinner results that look normal, and the answer would report "no precedent" when the search was really running on one leg. A clear failure is better than a quiet wrong answer.
