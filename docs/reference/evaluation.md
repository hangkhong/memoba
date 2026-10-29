# Evaluation status

The foundation is tested separately from live model quality. Gemini checks were paused on 2026-10-28 because requests were rate-limited. The user authorized a small OpenAI runtime check on 2026-10-29, without model comparison or a semantic evaluation campaign.

## Corpus and request fixtures

[`evals/local-v0/corpus.ts`](../../evals/local-v0/corpus.ts) contains six local cases and an authored challenge corpus of 24 synthetic cases, split equally between the two templates. Cases include achieved, failed, unknown, and archived outcomes.

[`evals/challenge/requests.ts`](../../evals/challenge/requests.ts) contains 12 requests with expected source slugs, required facets, expected gaps, and forbidden conclusions. The first two are local fixtures. Source slugs resolve to actual case/revision IDs in the ignored `.superpowers/evals/seed.json` manifest after seeding.

The fixture contract tests check counts, schemas, and source references. These authored expectations need human review before they can serve as calibrated ground truth. They are not model-generated evaluation scores.

## Gemini checkpoint on 2026-10-28

- Direct Gemini embeddings returned two vectors with 1536 dimensions.
- Six labelled cases were indexed with the real embedding provider before the rate limit.
- A browser saved and published a real synthetic case and inspected its revision.
- The first live analysis failed structured output validation. A later attempt failed during the provider call. That checkpoint did not establish a complete live brief or semantic acceptance.

## OpenAI runtime checkpoint on 2026-10-29

The browser saved and indexed a synthetic case using `text-embedding-3-small` at 1536 dimensions. A structured analysis using `gpt-6-luna` through Responses with low effort completed, executed `search_knowledge`, and persisted its brief. The user-visible citations opened, the authorized brief endpoint returned successfully, and refresh did not start another analysis.

The completed run reported 8188 input tokens, 1395 output tokens, and 9583 total tokens. It completed in approximately 18.6 seconds within the existing deadline. The existing output budget was sufficient for this run. These observations establish runtime integration for one scenario, not semantic acceptance or general latency guarantees.

The claim schema retains its literal `kind` variants and observed-reference requirements. It uses a Zod union so the emitted provider schema contains supported `anyOf`. The earlier SQL `oneOf` constraint remains equivalent because the kind literals make its branches mutually exclusive.

## Foundation verification

On 2026-10-29, the OpenAI integration passed lint, typecheck, production build, 65 Vitest tests, 94 native SQL assertions, and eight browser regression tests. Both provider credentials were disabled for offline tests.

On 2026-10-28, the default suite passed 45 Vitest tests, 55 native SQL assertions, and five browser tests with model credentials disabled. Clean installation, lint, typecheck, production build, and security advisors also passed. These checks establish deterministic behavior; they do not measure model quality.

## Remaining acceptance work

When quota is available, run both local requests and inspect citations, activity, usage, and latency. Then run each of the 12 challenge requests twice. Record actual source IDs and evaluate support for historical claims, hard constraints, contradictions, unknowns, and access.

Compare basic hybrid retrieval against one-hop relation expansion and context assembly on four requests with comparable context budgets. Report retrieval coverage and counterexample retention separately from semantic support. An ID-valid citation does not demonstrate that the source supports a conclusion.

The complete case-to-brief acceptance suite remains pending until these live checks and semantic reviews pass. Run commands are in [Run locally](../how-to/run-locally.md).
