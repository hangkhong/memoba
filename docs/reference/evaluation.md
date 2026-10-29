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

## Text-agent evaluation

On 2026-10-29, a local browser saved and indexed one synthetic case, asked a text question, opened its cited source, and submitted a referential follow-up. Both runs completed and both answers remained visible after refresh. The case recorded a controlled canary with rollback ready and an unknown outcome. Both answers distinguished that record from proposed steps and did not claim a successful historical outcome. The follow-up addressed the smaller-team request and retained the no-downtime constraint. This is one reviewed scenario, not a general quality score.

The first run (`2bc69604-6f35-4bfe-a725-43ef1e67dc31`) called `search_cases` and `read_case`, used 4,226 tokens, and took 11.411 seconds between database admission and completion. The follow-up (`7f70483f-bac4-4d8a-9d50-66727def9b33`) called `search_cases` twice and `read_case` once, used 5,867 tokens, and took 9.819 seconds. Both cited the saved approach and outcome sections. These are two individual local observations, not a latency comparison or a guarantee. The ignored evidence file is `.superpowers/verification/agent-engine-simplification/live-runs.json`; the follow-up UI capture is beside it. The original end-to-end script was interrupted after reaching the first answer because it used an outdated follow-up field label. A separate UI session completed and reloaded the follow-up.

The runs reported 513 and 491 output tokens, below the current per-call cap. Neither approached the deadline or exercised the final 60-second synthesis reserve. These observations do not establish that the model-step, tool-call, context, or output caps are sufficient for more complex cases.

[`evals/text/scenarios.json`](../../evals/text/scenarios.json) defines eight synthetic scenarios. They cover a direct precedent, complementary and conflicting cases, a failure, changed conditions, no precedent, ambiguity, and a referential follow-up. The expected source slugs and review points are proposed fixtures. They have not been reviewed by the user and are not calibrated scores. Source expectations assume that the 24-case challenge corpus is published and indexed.

The runner executes one named scenario per invocation against a local running app. It needs the demo credentials in ignored `.env.local`, a configured real model, and indexed synthetic cases. Seeding the challenge corpus uses the real embedding provider. Each run creates a conversation in the demo workspace and does not delete it.

```sh
node --env-file-if-exists=.env.local evals/text/runner.mjs --live --scenario direct-precedent
```

Set `MEMOBA_EVAL_URL` only to a local HTTP origin when the app uses a different port. The runner writes a mode-600 JSON artifact under `.superpowers/evals/text/`. It records the question, observed tool-start events, final text and cited source identities, reported usage, client elapsed time, and terminal status. A failed or incomplete scenario produces a nonzero exit. Follow-up scenarios stop when the first turn does not complete.

The HTTP API does not expose tool arguments, all source IDs delivered to the model, or individual correction attempts. The HTTP artifact sets those fields to null. It records `INVALID_CITATION` when that is the saved terminal error, but cannot reconstruct an earlier corrected citation failure. A source ID in a saved answer is a cited source, not a complete list of sources read.

For an optional local, non-persistent trace, use `--trace-live --scenario <id>` instead of `--live`. It uses the agent and knowledge adapters with an authenticated local Supabase client and records tool inputs, source IDs submitted to model steps, and validation events in a private artifact. It does not save a run or brief. A submitted source ID does not prove provider receipt if the model step fails. The runner does not score semantic support or advice quality.

Inspect each answer against the fixture review points and its authorized sources. Check the decision, user restrictions, adaptations, contradictory evidence, and any asserted historical outcome. Record incomplete runs rather than excluding them. Compare duration and resource use only after identifying what the recorded measurement includes.

## Deterministic checks and remaining work

`npx vitest run src/modules/analysis/text-agent.test.ts src/modules/analysis/budget.test.ts` exercises scripted tool errors, citation failures, and deadline behavior without a paid model call. `npx vitest run evals/text/runner.test.ts` checks stream parsing and fixture structure. To exercise the runner against a temporary scripted local server, run `MEMOBA_EVAL_RUNNER_SMOKE=1 npx vitest run evals/text/runner.test.ts` with permission to bind a local port. That test does not establish live model quality.

An initial exploratory pass completed eight scenarios with the synthetic corpus. It exposed a context limit in five scenarios; in one comparison, the answer repeated a pilot claim from the question without reading that case. The disclosed-section cap was subsequently increased while the token budget remained bounded. Deterministic tests cover three short cases and explicit omissions, but the model scenarios have not been repeated after that change. Further evaluation and observation are deferred. A Vercel preview smoke test remains separate from local verification. Neither a completed run nor a valid citation ID proves that its source supports the claim.
