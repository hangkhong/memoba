# Evaluation record

This page records what was measured and what was not. Every result is an individual run against a synthetic corpus, reviewed by the person building the product. None of them is a quality score. A completed run or a valid citation does not prove that a source supports a claim.

Model quality is tested apart from the deterministic checks. `npm test`, `npm run test:db`, and `npm run test:e2e` run with model credentials disabled.

## Corpora and scenarios

| Fixture | Holds |
|---|---|
| [`evals/demo/corpus.ts`](../../evals/demo/corpus.ts) | The 20 demo cases of Northwind Ledger, a fictional company |
| [`evals/demo/documents.ts`](../../evals/demo/documents.ts) | The five demo process documents with version histories |
| [`evals/demo/prompts.ts`](../../evals/demo/prompts.ts) | The three suggested prompts and the three seeded conversations |
| [`evals/local-v0/corpus.ts`](../../evals/local-v0/corpus.ts) | Six local cases and the 24-case challenge corpus |
| [`evals/challenge/requests.ts`](../../evals/challenge/requests.ts) | 12 requests with expected sources and gaps |
| [`evals/text/scenarios.json`](../../evals/text/scenarios.json) | Named scenarios over the challenge and demo corpora |

The expected sources are authored fixtures. They have not been calibrated as ground truth.

## Run an evaluation

The runner executes one named scenario per invocation against a local running app. It needs the demo credentials in `.env.local`, a configured model, and an indexed corpus.

```sh
node --env-file-if-exists=.env.local evals/text/runner.mjs --live --scenario direct-precedent
```

Use `--trace-live` instead of `--live` for an in-process trace that records tool inputs, sources, and validation events. A trace saves no run. Artifacts go to the ignored `.superpowers/evals/text/` directory. Set `MEMOBA_EVAL_URL` only to a local HTTP origin.

The runner does not score semantic support or advice quality. Read each answer against its review points and its sources. Record incomplete runs instead of excluding them.

`npx vitest run src/modules/analysis/text-agent.test.ts src/modules/analysis/budget.test.ts` exercises tool errors, citation failures, and deadlines with no paid model call.

## Results

Unless stated otherwise, these runs used `gpt-6-luna` and `text-embedding-3-small` locally on 2026-10-30 and 2026-10-31.

### Suggested prompts on two corpora

The same three prompts ran before and after the corpus was rewritten as detailed retrospectives of about 3,000 characters per case.

| Prompt | Thin corpus | Detailed corpus |
|---|---|---|
| Launch to all customers | 22 s, 10,016 tokens. Cited the staged rollout. Named the all-at-once launch from a preview, said it could not retrieve that text, and did not cite it | 16 s, 8,585 tokens. Read and cited both cases |
| Price increase with notice | 13 s, 9,767 tokens. Cited the failed Pro increase and the Starter increase, and named the changed condition | 16 s, 11,285 tokens. Same sources, and also named the contract-notice condition from the failed case |
| Singapore data center | 6 s, 1,507 tokens. Said no relevant case was found | 6 s, 1,619 tokens. Same |

### Context stress run

Seven questions ran after `read_case` was reworked, search was capped per case, and limits were raised. The first three are the suggested prompts, and the rest need many cases. "Previewed" counts distinct cases in search previews, and "read" counts distinct cases passed to `read_case`.

| Question | Previewed | Read | Peak input | Total tokens | Seconds |
|---|---|---|---|---|---|
| Launch to all customers | 20 | 3 | 8,348 | 14,471 | 13 |
| Price increase with notice | 4 | 2 | 4,583 | 7,642 | 10 |
| Singapore data center | 0 | 0 | 842 | 1,706 | 3 |
| All pricing changes | 8 | 3 | 5,154 | 11,291 | 12 |
| All launches, rollouts and migrations | 18 | 6 | 10,077 | 27,435 | 23 |
| Customer-facing incidents and outages | 10 | 3 | 5,711 | 10,178 | 14 |
| Keeping customers who threaten to cancel | 7 | 4 | 6,737 | 13,362 | 16 |

No run hit a read-side `CONTEXT_LIMIT`. A first pass with `previewTokens` at half its value hit the search-side limit in two runs, which saw only 13 or 14 cases, so that value was doubled. The other values were kept. The agent read two to six cases even on broad questions, so the practical ceiling in this run was model behavior, not budget.

### Restructured instructions

The instructions were rewritten with an exact answer template and a coverage line, and the same seven questions ran again.

| Question | Previewed | Read | Model's coverage line | Total tokens | Seconds |
|---|---|---|---|---|---|
| Launch to all customers | 20 | 3 | "Reviewed 3 of 3 matching cases." | 31,120 | 21 |
| Price increase with notice | 15 | 2 | "Reviewed 2 of 2 matching cases." | 14,832 | 14 |
| Singapore data center | 3 | 0 | "No recorded case matched this request." | 5,852 | 11 |
| All pricing changes | 12 | 2 | "Reviewed 2 of 2 matching cases." | 14,755 | 10 |
| All launches, rollouts and migrations | 15 | 9 | "Reviewed 9 of 11 matching cases." | 38,087 | 21 |
| Customer-facing incidents | 10 | 3 | "Reviewed 3 of 3 matching cases." | 16,935 | 9 |
| Keeping customers who threaten to cancel | 18 | 2 | "Reviewed 2 of 2 matching cases." | 19,248 | 12 |

The coverage line matched the exact format in 7 of 7 answers, up from 3 of 7. Six answers used the template, and in five of them "What's different this time" named a concrete condition the cases lacked. An example is 90 days' notice and a one-year price hold, against a Pro case with 10 days and neither.

"Matching" was the model's own count. It said "2 of 2" after previewing 12 to 18 cases. The broadest question read nine cases and hit the read-side limit three times.

**Reasoning effort.** The same seven questions at `medium` read 23 cases in total against 21 at `low`, kept 7 of 7 compliance, used 139,314 tokens against 140,829, and took 19 seconds on average against 14. `low` stayed the default.

### Coverage computed by the application

The application then derived coverage from tool results. For all seven questions, the saved coverage agreed with the trace on cases previewed and read.

| Question | Model-written | Computed |
|---|---|---|
| Launch to all customers | "Reviewed 3 of 3" | Read 3 of 20 |
| Price increase with notice | "Reviewed 2 of 2" | Read 2 of 14 |
| Singapore data center | "No recorded case matched" | Found 2 cases, none read |
| All pricing changes | "Reviewed 2 of 2" | Read 3 of 13 |
| All launches, rollouts and migrations | "Reviewed 9 of 11" | Read 5 of 15 |
| Customer-facing incidents | "Reviewed 3 of 3" | Read 4 of 11 |
| Keeping customers who threaten to cancel | "Reviewed 2 of 2" | Read 2 of 15 |

The two columns come from separate runs, so the cases read differ as well as the counts. The computed denominators are preview counts, and the model's count understated them in six of seven questions. A "found" count is not a relevance judgment: the Singapore question previews two nearest neighbors that the model judged irrelevant.

The answer view no longer shows a coverage line. The run still saves the count, and the activity view reports per-source results from tool events.

### Process documents

Five scenarios ran against the 20 cases and five documents of 7,100 to 10,300 characters each.

| Measurement | Result | Decision |
|---|---|---|
| Five search cards | About 2,400 tokens | `documentPreviewTokens` kept |
| Reading one document in full | 11 to 18 sections, 5,000 to 7,200 tokens | Document read pool raised, because at the old size the conflict scenario lost one block of the release procedure |
| Output of a five-section answer | 695 to 1,947 tokens | `outputTokens` raised, because a run at 97% of the cap is one longer answer from failing |
| Search recall at the distance cutoff | On-topic queries returned the expected document, and the unrelated query returned none | Cutoff kept |

After the change, no scenario hit `CONTEXT_LIMIT`. Runs used 15,100 to 26,800 total tokens and took 14 to 28 seconds.

The conflict answer reported a 60-day Starter case against the 90-day policy without calling it a violation. The process-only answer said no case matched and followed the deletion steps in order. A full walk-through listed every prerequisite, step, hold, and stop condition, and named version 3 and its effective date. In that answer "Where practice and process differ" was filled with a weak difference. The prompt asks for that heading only for a real difference, so this is a model-compliance issue to watch.

In the running app, a saved answer that cited version 1 kept showing version 1 text after version 2 was published, with a notice that a newer version exists.

### Reviewed system prompt

Ten traces ran on the final prompt. None needed correction, hit `CONTEXT_LIMIT`, or ended incomplete. Three were read in full, and the other seven were checked for tool results and size only.

| Scenario | Read in full | Behavior |
|---|---|---|
| No difference (duplicate-charge approvals) | Yes | The differences heading was absent, and the opening answered the question |
| Cannot meet a requirement (30 days' notice) | Yes | Said "No" first, named the 90-day requirement, and gave the exception route |
| Process silent (app store review) | Yes | Said the procedure does not cover it, inferred no rule, and named the owner to ask |
| Case only (helpdesk migration) | No | Still read a process document that does not apply |

The largest run used 38,438 input tokens, up from about 25,100, because the prompt tells the model to read whole documents unless only parts matter.

## Not established

- Whether a person finds the advice fits a real decision. No real team has used the product.
- Whether cited sections support the claims beside them across many answers. In one early pass, an answer repeated a pilot claim from the question without reading that case.
- Behavior on a large corpus.
- Hosted behavior. The app is deployed at [memoba.vercel.app](https://memoba.vercel.app), and the landing page responded on 2026-11-01. The acceptance checks in [Deploy the demo](../how-to/deploy-demo.md#4-deploy-and-verify) are not recorded here yet.
