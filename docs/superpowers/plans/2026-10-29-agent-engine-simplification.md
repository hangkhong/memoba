# Simplify the knowledge agent engine

The local agent foundation, versioned persistence, and case capture are implemented and checked. The user deferred further model evaluation on 2026-10-29. A hosted preview is not authorized by this plan.

Build on `codex/agent-engine-simplification`, created from `main` at `1136e11`.
The deliverable is a seven-day PM demo of natural-language questions answered with useful advice grounded in past cases.
The model decides whether to call a tool or answer. The application supplies instructions, tools, knowledge, conversation context, and bounded execution.
Deploy within Vercel's free tier. Vercel officially calls this plan Hobby. This plan uses the term Vercel Free and does not depend on a Pro trial, paid upgrade, or paid-only runtime duration.

## Execute this plan

Use the task-sized Feature workflow from `pstack:poteto-mode`, with the Codex host mappings at `/Users/steven/.config/pstack/codex-host.md`.
This is one implementation branch, not a multi-PR program or scheduled autonomous run.
Implement the units below in dependency order. Check a box only when the named evidence exists.
Record commands, results, source IDs, and unresolved failures in the implementation report.
Use `gpt-6.1-terra` with medium reasoning if execution delegates work, as requested in this conversation.
Do not merge or deploy as part of this plan.

## Hold the approved scope

- [ ] Accept the user's natural-language text without requiring a separate context field, request template, concepts, or constraint form.
- [ ] Let one OpenAI-backed agent choose searches, case reads, further investigation, clarification, and final prose.
- [ ] Return natural-language text with checkable citations. Do not require the five-section Reuse Brief.
- [ ] Keep manual case capture and the two fixed case templates. Do not add connectors, uploads, crawling, or automated case authorship.
- [ ] Keep existing authentication and membership behavior. Do not add a permission model, roles, approval flows, or per-tool permissions.
- [ ] Retain source identity, immutable revisions, indexing, publication, saved questions, cancellation, and refresh persistence.
- [ ] Defer generative UI, AGUI, visual polish, durable background resume, external web research, and multiple reasoning agents.
- [ ] Treat model usefulness as unproven until live evidence is reviewed. A completed run or valid citation ID does not establish semantic support.

## Apply the runtime decision

The user selected a hard deadline of 300 seconds per run on 2026-10-29. The current implementation still uses 90 seconds.
The clock starts at database admission. Model calls, embeddings, tool execution, retries, citation correction, and completion share the persisted deadline.
Each new user turn or explicit retry gets a new admitted run. An internal tool step does not reset the clock.
For Vercel Free deployment, distinguish this selected budget from the host's invocation ceiling. The proposed hosted profile below uses a shorter application deadline. That refinement is still under discussion.

- [ ] Set the selected deadline in `src/lib/contracts/limits.ts` during implementation. Keep that file as the runtime limits owner.
- [ ] Replace the SQL admission ceiling in a new migration. Existing `admit_analysis` clamps `deadline_ms` to `90000`.
- [ ] Reuse the admitted deadline in `src/modules/analysis/runtime.ts` and `budget.ts`, including downstream abort signals.
- [ ] Add a synthesis reserve to the runtime policy. Start by reserving the final 60 seconds for answering and citation correction, then measure whether this allocation is useful.
- [ ] Make the reserve stop admission of new investigative tool work. It must not terminate a valid answer merely because the reserve begins.
- [ ] Keep a hard timeout that aborts unfinished provider and tool operations. Cleanup has a separate bounded persistence attempt.
- [ ] Prevent tool and model-step limits from ending the run without room for a final answer. Count final synthesis and any correction in the total budget.
- [ ] Review the current model-step, tool-call, context, and output-token caps together. Do not assume a larger deadline makes the current caps adequate.
- [ ] Keep budget tuning in the owning limits definition and cite measured evidence for later changes. Do not scatter replacement constants through routes or SQL tests.

Verification requires fake-clock tests for the selected total deadline, a late tool request, cancellation, exhausted budgets, and persistence at the deadline boundary. SQL tests must demonstrate that the selected duration survives admission without the old clamp. A hanging operation must not receive a fresh deadline on its next step.

## Fit the loop inside Vercel execution limits

Research was checked against official Vercel documentation on 2026-10-29. No deployed project's settings have been inspected, and no Vercel deployment is authorized by this plan.

Vercel's [pricing page](https://vercel.com/pricing) identifies Hobby as the free plan. There is no separate Free runtime tier in that pricing table. Use the Hobby limits when looking up the selected free tier, without enabling a Pro trial or upgrade.
With Fluid Compute enabled, Vercel Free has a default and maximum invocation duration of 300 seconds. The duration includes streamed responses and time waiting on external services. Streaming does not renew the duration. See [function limits](https://vercel.com/docs/functions/limitations).
New projects enable Fluid Compute by default, but deployment acceptance must verify the actual project settings. See [Fluid Compute configuration](https://vercel.com/docs/fluid-compute).
Node.js supports streaming. Edge Functions are deprecated for new projects, and legacy Edge streaming also has a 300-second limit with an initial-response requirement. See [runtime streaming](https://vercel.com/docs/functions/runtimes) and the [Edge duration notice](https://vercel.com/changelog/new-execution-duration-limit-for-edge-functions).

- [ ] Keep Node.js 24 and Fluid Compute for the agent routes. Do not switch to Edge to avoid a timeout.
- [ ] Verify that the deployment uses Vercel Free and that all required Vercel capabilities fit its included limits. Do not use Pro trial access as acceptance evidence for the free-tier deployment.
- [ ] Export a literal `maxDuration = 300` in both analysis route entry points when implementing. Verify the effective duration in the built deployment. See [Next.js route configuration](https://vercel.com/docs/functions/configuring-functions/duration).
- [ ] Resolve the hosted application deadline before editing limits. The proposed Vercel Free profile uses up to 270 seconds for the application run and leaves roughly 30 seconds within the host ceiling for request setup, persistence, and response completion. This allocation is a design proposal, not a measured guarantee.
- [ ] Anchor the hosted application cutoff to request-handler entry as well as the database-admitted deadline. Admission starts after some invocation time has already elapsed.
- [ ] Keep the synthesis reserve inside the application deadline. Do not add synthesis or citation correction after that deadline.
- [ ] Bound setup and terminal persistence so that a long database call cannot consume all host headroom. If the host terminates execution before cleanup, reconcile the persisted expired run on its next read.
- [ ] Open the existing UI data stream after admission, emit actual activity events, and publish the final answer after citation checks. Do not invent tool activity to fill a quiet stream.
- [ ] If preview testing exposes idle connection closure, add transport heartbeat events that carry no invented progress. A heartbeat does not extend `maxDuration`.
- [ ] Keep explicit user cancellation and do not promise background continuation or refresh resume. `waitUntil` is not a way to exceed the invocation deadline.
- [ ] Add a preview smoke test lasting more than 60 seconds with real server execution and observed stream events. Local Next.js tests cannot establish Vercel execution limits. Report this test as pending until a preview is explicitly authorized.
- [ ] Test graceful application timeout, failed final persistence, and recovery after an externally terminated invocation. Do not deliberately exceed the host limit in a paid live-model run.

Keep the synchronous request-bound loop for this demo. Consider durable execution only after observed runs need more than the host ceiling, survival after disconnect, or resumable external waits. Those requirements are outside this implementation scope.
Keep the deployment inside the free tier's 300-second invocation ceiling. If the requested work does not fit, record the unmet requirement and revisit the run budget or execution design. Do not make a paid upgrade part of this demo plan. Do not claim that streaming makes a full 300-second agent budget safe inside a 300-second invocation.

## Unit 1. Define text input and answer persistence

Own the schemas and persistence contracts before changing orchestration.

Files include `src/modules/analysis/schema.ts`, `src/modules/conversations/schema.ts`, `src/modules/conversations/service.ts`, `src/modules/briefs/schema.ts`, their repositories, `scripts/db-contracts.ts`, and a new SQL migration.

- [ ] Define a versioned run input that preserves the raw user message and the bounded conversation context used for that run.
- [ ] Remove the mandatory `NormalizedRequest` form shape from new question admission. Do not insert fake context or require a model extraction call before reasoning.
- [ ] Define the new answer as free text plus server-owned citation and source metadata. Do not classify every sentence into a required claim schema.
- [ ] Keep displayed source IDs scoped to their run. An old `[S1]` must not silently resolve to the current run's `[S1]`.
- [ ] Preserve existing saved cases, conversations, runs, and briefs. Use explicit format-version readers for historical data where necessary.
- [ ] Generate matching SQL JSON checks from the owning Zod schemas with the existing contract generator. Regenerate database types after migration.
- [ ] Apply the selected deadline through the same migration and verify admission, terminal cleanup, and retry behavior.

Verification requires focused schema and repository tests, SQL contract tests, admission tests, and a historical saved-brief read. Do not reset the local database to avoid migration work.

## Unit 2. Give the agent useful knowledge tools

Files include `src/modules/analysis/tools.ts` and `src/modules/knowledge/{contracts,service,repository,context}.ts`.

- [ ] Expose two tools to the reasoning model, `search_cases` and `read_case`.
- [ ] Keep hybrid keyword and vector retrieval inside the knowledge service. Tool callers do not select a workspace or issue SQL.
- [ ] Make search accept a natural-language query. Remove required purpose labels and concept UUIDs from model-facing input unless evidence demonstrates that they help.
- [ ] Return compact search candidates grouped by case, with matching sections, excerpts, outcome state, and revision identity. A ranking score is not a confidence score.
- [ ] Make case reads supply the requested evidence with enough surrounding case context to understand applicability, constraints, and outcome.
- [ ] Pin one revision per case within a run. Bound full-case reads and accumulated tool content.
- [ ] Issue citeable IDs only for source content actually delivered by case reads. Search previews select sources but are not final citation evidence.
- [ ] Distinguish successful empty search, partial results, tool failure, and content omitted by a budget. Do not report unread or omitted content as evidence that does not exist.
- [ ] Deduplicate already supplied sections and report when a repeated call adds no information.
- [ ] Remove `expand_relations` from the model's required tool set. Retain internal relation data and historical behavior unless its deletion is necessary and justified.
- [ ] Describe each tool's purpose, inputs, result meaning, limits, and useful next action. Treat stored case content as data rather than executable instructions.

Verification requires tests for keyword and semantic candidates, case grouping, readable surrounding context, revision pinning, duplicate reads, context exhaustion, empty success, and provider failure. Inspect the exact tool payloads the model receives.

## Unit 3. Replace the fixed pipeline with a model-led loop

Files include `src/modules/analysis/{agent,harness,runtime,budget,events,planner}.ts` and the focused agent tests.

- [ ] Use the installed AI SDK 7 `ToolLoopAgent` and its documented loop controls. Read installed SDK documentation before editing unfamiliar APIs.
- [ ] Provide instructions describing the role, knowledge coverage, case fields, tools, citation rules, and the difference between observed history and proposed advice.
- [ ] Pass the raw question and relevant conversation context to the model. Let it choose queries and additional reads.
- [ ] Remove the mandatory three-query pre-retrieval, automatic relation expansion, structured brief output, and obsolete planner wiring from the active path.
- [ ] Ask the model to investigate past-work claims before answering. Do not turn greetings or a necessary clarification into a forced research pipeline.
- [ ] Instruct it to compare present conditions with past conditions, seek counterexamples when relevant, and state missing evidence.
- [ ] Allow useful general reasoning when precedents are absent, with a clear distinction from recorded team experience.
- [ ] Let weak evidence, contradictory cases, successful empty search, and tool errors reach the model as different situations.
- [ ] Let the model answer, ask a necessary clarification, or continue tools within the runtime budget. Do not add separate planner, critic, or evaluator models to runtime.
- [ ] Emit activity from actual execution events. Do not manufacture a narrative of private model reasoning.
- [ ] Remove unused implementation and update tests that previously required the fixed brief pipeline.

Verification requires scripted model tests with the official AI SDK test helpers. Cover search, read, revised search, and final text in one loop. Also cover direct clarification, empty search, contradictory evidence, no-progress calls, deadline, cancellation, and budget exhaustion. Test control flow without claiming that scripted responses prove model quality.

## Unit 4. Validate and save text answers with citations

Files include `src/modules/briefs/{schema,validation,repository}.ts`, `src/modules/analysis/stream.ts`, and the answer display integration.

- [ ] Validate citation markers against content actually disclosed to the model, not the entire retrieved candidate registry.
- [ ] Resolve each marker to the stored case, revision, section, and excerpt. Keep sources inspectable after refresh.
- [ ] Preserve citation occurrence near the supported text. A source list at the end alone is insufficient for understanding which claim it supports.
- [ ] Permit at most one citation-correction call inside the same run deadline. Do not silently discard a bad marker and mark the answer verified.
- [ ] Treat uncited historical assertions as a semantic evaluation concern. An ID validator cannot reliably identify and verify every such assertion.
- [ ] Save final text, cited source snapshots, usage, and terminal status. Keep tool diagnostics separate from the rendered answer.
- [ ] Keep existing activity feedback while the answer is generated and checked. Publish final answer text after validation for this scope.
- [ ] Do not require token streaming or a new UI protocol. If token streaming is added later, define provisional versus validated text first.
- [ ] Preserve legacy brief reads without requiring new answers to use the legacy brief format or editor.

Verification requires tests for invented citations, IDs from unread candidates, stale prior-turn markers, valid source snapshots, correction failure, no-precedent answers without fabricated citations, and saved-answer reload.

## Unit 5. Connect natural-language chat and lighten manual capture

Files include conversation routes, `src/modules/conversations/{composer,conversation-view,chat-session,service,repository}.ts`, `src/modules/briefs/brief-view.tsx`, case forms, case services, and matching schema migrations.

- [ ] Send a text-only question without requiring Request details, a template, concepts, or separate Context. Keep legacy routes working where needed for saved data.
- [ ] Provide a bounded sequence of relevant user and assistant messages for the next turn. Do not concatenate every follow-up into a single required context field.
- [ ] Treat prior assistant text as conversation context. Re-read case evidence when a new answer depends on previous source claims.
- [ ] Preserve user-stated restrictions when selecting history. Make context overflow explicit rather than silently losing a restriction.
- [ ] Keep saved questions, retry, Stop, and refresh behavior. Render the new answer as text with source links and excerpts.
- [ ] Keep two manual case templates. Require title, problem, context, approach, and outcome state. Make other text fields optional, with outcome details required when a known outcome is asserted.
- [ ] Index only the nonempty sections. Update publication checks, schema generation, SQL contracts, and form validation together.
- [ ] Show saved versus available-to-ask status. Read the returned `indexState` when retrying instead of treating every HTTP success as successful indexing.
- [ ] Keep layout changes limited to making this use case work. Do not add generative UI or redesign the application.

Verification requires browser tests for a first question with no details, a source click, a referential follow-up, cancellation, retry, refresh, minimal case save, unknown outcome, failed indexing, and successful reindex. Check the actual screens and source text.

## Unit 6. Prove the use case and update the owning documents

Files include `evals`, the evaluation runner required for repeatable live checks, focused regression tests, `docs/reference/evaluation.md`, `docs/reference/system-contracts.md`, `docs/architecture/FOUNDATION.md`, and the product design spec.

- [ ] Capture the baseline before engine changes using existing recorded evidence or an explicitly authorized small live run. Do not launch a model comparison campaign.
- [ ] Build a repeatable runner that records the original question, actual tool calls, delivered source IDs, final text, citation failures, usage, duration, and termination reason.
- [ ] Use representative questions covering a direct precedent, complementary cases, a failed precedent, changed conditions, conflicting cases, no precedent, an ambiguous request, and a referential follow-up.
- [ ] Add deterministic tool-failure and deadline scenarios separately from paid semantic checks.
- [ ] Review fixture expectations before scoring. Distinguish finding the right source from interpreting it correctly.
- [ ] Inspect whether advice answers the user's decision, respects stated constraints, explains adaptations, and avoids invented historical outcomes.
- [ ] Measure completed-run duration and tool behavior under the selected deadline. Record timeout and incomplete results instead of dropping them from the report.
- [ ] Identify whether model-step, tool-call, context, or output limits truncate useful work. Change them only with a recorded reason and rerun affected cases.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:db`, `npm run build`, and the relevant `npm run test:e2e` checks.
- [ ] Open the app and inspect a real case-to-answer run with OpenAI, a source back-check, and a follow-up. Offline tests do not replace this check.
- [ ] Update the spec and architecture to the approved text-input, model-led loop, text-answer design. Update contracts and local instructions when their commands or behavior change.
- [ ] Report exact checks and limitations. Do not describe model usefulness, latency improvement, or complete acceptance as proven without the corresponding evidence.

## Record the remaining design judgments

The user selected 300 seconds and Vercel Free. The hosted proposal refines the application deadline to leave invocation headroom and remains under discussion. The initial synthesis reserve and the other execution caps remain implementation hypotheses to test.
The case-field defaults in Unit 5 are a concrete simplification proposal within the approved manual-capture scope.
Citation identity is mechanically checkable. Semantic support and advice quality need reviewed examples.
No permission expansion, UI framework migration, model bakeoff, merge, or deployment is required for acceptance.

The implementation is complete when a user can enter a natural-language request, observe actual agent tool work, receive useful text with inspectable evidence, ask a referential follow-up, and reload the saved result. The evaluation report must show which scenarios passed and which remain unresolved.
