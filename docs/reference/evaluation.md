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

[`evals/text/scenarios.json`](../../evals/text/scenarios.json) defines eight synthetic scenarios over the challenge corpus and four over the demo corpus and documents. They cover a direct precedent, complementary and conflicting cases, a failure, changed conditions, no precedent, ambiguity, and a referential follow-up. The expected source slugs and review points are proposed fixtures. They have not been reviewed by the user and are not calibrated scores. Source expectations assume that the 24-case challenge corpus is published and indexed.

The runner executes one named scenario per invocation against a local running app. It needs the demo credentials in ignored `.env.local`, a configured real model, and indexed synthetic cases. Seeding the challenge corpus uses the real embedding provider. Each run creates a conversation in the demo workspace and does not delete it.

```sh
node --env-file-if-exists=.env.local evals/text/runner.mjs --live --scenario direct-precedent
```

Set `MEMOBA_EVAL_URL` only to a local HTTP origin when the app uses a different port. The runner writes a mode-600 JSON artifact under `.superpowers/evals/text/`. It records the question, observed tool-start events, final text and cited source identities, reported usage, client elapsed time, and terminal status. A failed or incomplete scenario produces a nonzero exit. Follow-up scenarios stop when the first turn does not complete.

The HTTP API does not expose tool arguments, all source IDs delivered to the model, or individual correction attempts. The HTTP artifact sets those fields to null. It records `INVALID_CITATION` when that is the saved terminal error, but cannot reconstruct an earlier corrected citation failure. A source ID in a saved answer is a cited source, not a complete list of sources read.

For an optional local, non-persistent trace, use `--trace-live --scenario <id>` instead of `--live`. It uses the agent and knowledge adapters with an authenticated local Supabase client and records tool inputs, source IDs submitted to model steps, and validation events in a private artifact. It does not save a run or brief. A submitted source ID does not prove provider receipt if the model step fails. The runner does not score semantic support or advice quality.

Inspect each answer against the fixture review points and its authorized sources. Check the decision, user restrictions, adaptations, contradictory evidence, and any asserted historical outcome. Record incomplete runs rather than excluding them. Compare duration and resource use only after identifying what the recorded measurement includes.

## MVP demo observations on 2026-10-30

These are individual local observations with `gpt-6-luna` and `text-embedding-3-small` against the 20-case demo corpus ([`evals/demo/corpus.ts`](../../evals/demo/corpus.ts)). They are not quality scores, and no hosted run has happened yet.

| Prompt | Run | Time | Tokens | Observation |
|---|---|---|---|---|
| Launch to all customers | `aea8a6a3-a00a-4374-bce6-9c5db723f9a0` | 22 s | 10,016 | Three sections. Cited the staged-rollout case. It named the all-at-once launch from a search preview but said it could not retrieve that case's text, so it did not cite it. |
| Price increase with notice | `9cfc35aa-0eb8-43fc-8753-9ebf841de9a6` | 13 s | 9,767 | Three sections. Cited the failed Pro increase and the Starter increase, and named the changed condition (90 days notice, one-year price protection). |
| Singapore data center | `d43f5218-a4f5-4753-9153-a5fb93ff24cc` | 6 s | 1,507 | No sections. Said no relevant recorded case was found. |

Import: unaccented Vietnamese-style notes produced an English draft with an `unknown` outcome and an empty observed outcome in about 9.6 seconds. English notes that described a result produced a draft with an `achieved` outcome. After Save, the case reached index state ready and a chat run (`e2641e38-fa84-4227-81ce-f4650a3a3427`, 9 s, 6,165 tokens) found and cited it. One other save attempt did not navigate; the cause was not investigated and is likely a missing required field in the draft, which the form marks.

After the corpus was rewritten with detailed retrospectives (3,000 characters per case on average, 2,200 to 3,900, about 760 tokens), the same three prompts were rerun locally. They completed in 16, 16 and 6 seconds (runs `3c18f7f1-a4d2-42df-9420-cf9bbb5bd826`, `789da253-7f55-4828-b0e7-d5b5d418e922`, `40eb0bc8-9333-4828-b860-ab11ed490f12`; 8,585, 11,285 and 1,619 tokens). The first prompt now read and cited both the all-at-once launch and the staged rollout, where the thinner corpus produced only one cited case. The second still cited the failed Pro increase and the Starter increase, and now named the contract-notice condition from the failed case. The third still said no relevant case was found. No answer reported omitted content. `contextSections` (24) binds before `contextTokens` (8,000) because a full case is under 1,000 tokens, so an answer that reads more than about three cases in full would hit the section cap; this was not observed and no limit was changed.

### Context stress run on 2026-10-30

After `read_case` was reworked (outcome headers, priority order, up to three cases per call), search was capped at two sections per case, and the limits in [`limits.ts`](../../src/lib/contracts/limits.ts) were raised, seven questions ran in process against the local 20-case corpus, with `gpt-6-luna`. The three suggested prompts come first; the other four need many cases. Each row is one run. "Previewed" counts distinct cases in search previews, "read" counts distinct cases passed to `read_case`, and "peak input" is the largest `inputTokens` reported for any single model step.

| Question | Previewed | Read | Read-side `CONTEXT_LIMIT` | Peak input | Total tokens | Seconds | Coverage statement |
|---|---|---|---|---|---|---|---|
| Launch to all customers | 20 | 3 | 0 | 8,348 | 14,471 | 13 | "Reviewed 3 of 18" |
| Price increase with notice | 4 | 2 | 0 | 4,583 | 7,642 | 10 | none |
| Singapore data center | 0 | 0 | 0 | 842 | 1,706 | 3 | none (no relevant case) |
| All pricing changes | 8 | 3 | 0 | 5,154 | 11,291 | 12 | none |
| All launches, rollouts and migrations | 18 | 6 | 0 | 10,077 | 27,435 | 23 | none |
| Customer-facing incidents and outages | 10 | 3 | 0 | 5,711 | 10,178 | 14 | "Reviewed 3 of 9" |
| Keeping customers who threaten to cancel | 7 | 4 | 0 | 6,737 | 13,362 | 16 | "Reviewed 4 of 7" |

No run hit a read-side `CONTEXT_LIMIT`, and no run came close to the model input ceiling (peak 10,077 of 64,000). The widest question read six cases and used 27,435 tokens in total across five steps, so total usage grew faster than peak input because each step re-sends the transcript.

One value was adjusted on this evidence. A first pass of the same seven questions with `previewTokens` at 4,000 hit the search-side `CONTEXT_LIMIT` in two runs, which then previewed only 13 or 14 cases, so a broad question could not list every matching case. At 8,000 no run hit it and the first prompt previewed 20 cases. The other starting values were kept.

Two observations are not limit problems. The agent read two to six cases even for broad questions, never approaching the "about 8" in the instruction, so the practical ceiling today is model behavior, not budget. And the coverage statement did not always use the "Reviewed N of M" form; some answers said "Reviewed 3 matching cases" or listed unread cases in prose. These are individual runs, not a quality score.

### Restructured instructions on 2026-10-30

`textInstructions` was rewritten following OpenAI's GPT-6 prompting guide: Identity, Instructions and Context sections, an exact answer template with a coverage line, an instruction to keep investigating and read up to 8 relevant cases, and the request wrapped in `<request>` after the static text. The same seven questions ran again in process against the local corpus. "Matching" and "Read" below are the numbers the model states in its coverage line; "Previewed" is the distinct cases the search returned.

Role check: for `gpt-6-luna`, `@ai-sdk/openai` treats the model as a reasoning model, so `systemMessageMode` defaults to `developer`. A request captured at the HTTP boundary showed the instructions sent as a `developer` message, so `models.ts` needed no change.

| Question | Previewed | Read | Coverage line | Peak input | Total tokens | Seconds |
|---|---|---|---|---|---|---|
| Launch to all customers | 20 | 3 | "Reviewed 3 of 3 matching cases." | 9,562 | 31,120 | 21 |
| Price increase with notice | 15 | 2 | "Reviewed 2 of 2 matching cases." | 6,622 | 14,832 | 14 |
| Singapore data center | 3 | 0 | "No recorded case matched this request." | 1,715 | 5,852 | 11 |
| All pricing changes | 12 | 2 | "Reviewed 2 of 2 matching cases." | 6,038 | 14,755 | 10 |
| All launches, rollouts and migrations | 15 | 9 | "Reviewed 9 of 11 matching cases." plus unread titles | 14,091 | 38,087 | 21 |
| Customer-facing incidents | 10 | 3 | "Reviewed 3 of 3 matching cases." | 8,646 | 16,935 | 9 |
| Keeping customers who threaten to cancel | 18 | 2 | "Reviewed 2 of 2 matching cases." | 8,479 | 19,248 | 12 |

The coverage line matched the exact format in 7 of 7 answers, up from 3 of 7 before the rewrite. Six answers used the template. In five of them "What's different this time" named a concrete condition that the recorded cases lacked, for example 90 days' notice and a one-year price hold against a Pro case with 10 days and none, or the monthly-billed Starter segment against contracted Pro customers. The sixth, the broad launches question, gave a cross-case pattern rather than a condition specific to a request. The answer to the Singapore question gave only a suggested next step, as instructed.

Two caveats. "Matching" is the model's own count of relevant cases, not the preview count: it said "2 of 2" after previewing 12 to 18 cases, so the line shows how many it judged relevant and read, not how many the search surfaced. And the broadest question read nine cases and hit the read-side `CONTEXT_LIMIT` three times, the first time that limit bound; the answer listed the two cases it did not read. Peak input there was 14,091 of 64,000.

Reasoning effort: the same seven questions with `reasoningEffort: "medium"` (set around the model in the evaluation script only) read 23 cases in total against 21 at low, kept 7 of 7 compliance, used 139,314 tokens against 140,829, and took 19 seconds on average against 14. Medium read slightly more, with the same compliance and token use, for about 35% more latency. `low` stays the default.

### Computed coverage on 2026-10-30

The coverage line is now derived by the app from tool results and saved with the answer, and the prompt no longer asks the model to write it. The same seven questions ran again in process. For each run the saved coverage was compared with the cases that appear in the trace's `search_cases` and `read_case` results: all seven agreed on cases previewed and cases read. A browser run of the price-change prompt showed "Read 2 of 14 cases found by search" with the unread titles in a collapsible list, both when the answer finished streaming and after a refresh.

| Question | Before: model-written | After: computed from tool events | Unread titles shown |
|---|---|---|---|
| Launch to all customers | "Reviewed 3 of 3" | Read 3 of 20 | 10 of 17 |
| Price increase with notice | "Reviewed 2 of 2" | Read 2 of 14 | 10 of 12 |
| Singapore data center | "No recorded case matched" | Found 2 cases, none read | 2 of 2 |
| All pricing changes | "Reviewed 2 of 2" | Read 3 of 13 | 10 of 10 |
| All launches, rollouts and migrations | "Reviewed 9 of 11" | Read 5 of 15 | 10 of 10 |
| Customer-facing incidents | "Reviewed 3 of 3" | Read 4 of 11 | 7 of 7 |
| Keeping customers who threaten to cancel | "Reviewed 2 of 2" | Read 2 of 15 | 10 of 13 |

The "before" column is the previous restructured-instructions run and the "after" column is a new run, so cases read differ between runs as well as the counts. The computed denominators are the real preview counts, which the model's own "matching" count understated in six of seven questions. Two things to know: the list is capped at 10 titles, so it can be shorter than the unread count; and the Singapore question previews two nearest-neighbour cases that the model judged irrelevant, so the line says "Found 2 cases, none read" next to prose saying no recorded case matched. Search returns the nearest cases under a similarity threshold, so a "found" count is not a relevance judgment.

Not yet checked: hosted runs on Vercel, run durations against the hosted deadline, and reviewer-level judgment of whether the advice fits.

## Process documents on 2026-10-31

These are individual local observations with `gpt-6-luna` and `text-embedding-3-small` against the 20-case demo corpus and the five seed documents in [`evals/demo/documents.ts`](../../evals/demo/documents.ts). They are not quality scores, and no hosted run has happened. The four scenarios in [`evals/text/scenarios.json`](../../evals/text/scenarios.json) with `corpus: "demo"` run through `--trace-live`: process plus case, process only, process against case, and a predating case. Each run was a single in-process trace.

Limits measured before any change:

| Measurement | Result | Limit | Decision |
|---|---|---|---|
| Document search cards | 244 to 285 tokens each (about 1,400 for five) | `documentPreviewTokens` 3,000 | Kept |
| Reading every seed document in full | 27 body sections, about 8,600 tokens (1.4 to 2.0 KB of text per document, 5 or 6 sections each) | `documentContextTokens` 12,000 and `documentContextSections` 24 | Kept. Tokens fit, but the section cap would bind when all five documents are read in full; no run read more than one |
| Output of a five-section answer | 589, 970, 1,250 and 1,276 tokens; every run finished with `stop` | `outputTokens` 2,000 | Kept |
| Search recall at `cosine<0.65` | Eight on-topic queries each returned the expected document (release, deletion twice, price twice, incident, refund); an unrelated query returned none | 0.65 | Kept |

One broad query ("How should we ship a risky change to production?") also returned the price change policy through its support-preparation block. Total tokens per run were 9,390 to 20,485 and runs took 10 to 19 seconds.

What the four answers showed. Process plus case cited the release procedure under the process heading and three cases under the cases heading, put the 5% and 25% hold times of the procedure next to the one-week holds of the staged case under "Where practice and process differ", and started its next step from the process. Process only said no recorded case matched, listed the deletion steps in the document's order, and cited the process in the next step. Against the 60-day Starter case it reported the difference from the 90-day policy without calling the case a violation and told the user to follow the policy. The predating scenario also named the policy as the requirement and the case as what happened; it did not state that the case predates the policy's effective date, which the rule permits only when the case text states a date. The wording is a review point for a person, not a score. No correction was needed in any run, so `MISPLACED_CITATION` was exercised only by unit tests.

In the running app, a pasted document showed a four-block preview, published in about three seconds, appeared in the Documents tab, and gained a second version after an edit. A process-only question and a process-plus-case question completed, a document citation opened the evidence panel (`Process · Delete`, effective date, owner, `Open current document`, no outcome line), the link opened the document at the cited block, and the saved answer survived a reload. The activity line read "Searched cases and documents · 15 cases found · 4 documents found".

## Deterministic checks and remaining work

`npx vitest run src/modules/analysis/text-agent.test.ts src/modules/analysis/budget.test.ts` exercises scripted tool errors, citation failures, and deadline behavior without a paid model call. `npx vitest run evals/text/runner.test.ts` checks stream parsing and fixture structure. To exercise the runner against a temporary scripted local server, run `MEMOBA_EVAL_RUNNER_SMOKE=1 npx vitest run evals/text/runner.test.ts` with permission to bind a local port. That test does not establish live model quality.

An initial exploratory pass completed eight scenarios with the synthetic corpus. It exposed a context limit in five scenarios; in one comparison, the answer repeated a pilot claim from the question without reading that case. The disclosed-section cap was subsequently increased while the token budget remained bounded. Deterministic tests cover three short cases and explicit omissions, but the model scenarios have not been repeated after that change. Further evaluation and observation are deferred. A Vercel preview smoke test remains separate from local verification. Neither a completed run nor a valid citation ID proves that its source supports the claim.
