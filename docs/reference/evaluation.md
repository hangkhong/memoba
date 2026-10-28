# Evaluation status

The foundation is tested separately from live model quality. The user paused API model checks on 2026-10-28 because Gemini requests were rate-limited.

## Corpus and request fixtures

[`evals/local-v0/corpus.ts`](../../evals/local-v0/corpus.ts) contains six local cases and an authored challenge corpus of 24 synthetic cases, split equally between the two templates. Cases include achieved, failed, unknown, and archived outcomes.

[`evals/challenge/requests.ts`](../../evals/challenge/requests.ts) contains 12 requests with expected source slugs, required facets, expected gaps, and forbidden conclusions. The first two are local fixtures. Source slugs resolve to actual case/revision IDs in the ignored `.superpowers/evals/seed.json` manifest after seeding.

The fixture contract tests check counts, schemas, and source references. These authored expectations need human review before they can serve as calibrated ground truth. They are not model-generated evaluation scores.

## Observed results

- Direct Gemini embeddings returned two vectors with 1536 dimensions.
- Six labelled cases were indexed with the real embedding provider before the rate limit.
- A browser saved and published a real synthetic case and inspected its revision.
- The first live analysis failed structured output validation. A later attempt failed during the provider call. No complete live brief or semantic acceptance result is claimed.

## Foundation verification

On 2026-10-28, the default suite passed 45 Vitest tests, 55 native SQL assertions, and five browser tests with model credentials disabled. Clean installation, lint, typecheck, production build, and security advisors also passed. These checks establish deterministic behavior; they do not measure model quality.

## Remaining acceptance work

When quota is available, run both local requests and inspect citations, activity, usage, and latency. Then run each of the 12 challenge requests twice. Record actual source IDs and evaluate support for historical claims, hard constraints, contradictions, unknowns, and access.

Compare basic hybrid retrieval against one-hop relation expansion and context assembly on four requests with comparable context budgets. Report retrieval coverage and counterexample retention separately from semantic support. An ID-valid citation does not demonstrate that the source supports a conclusion.

The complete case-to-brief acceptance suite remains pending until these live checks and semantic reviews pass. Run commands are in [Run locally](../how-to/run-locally.md).
