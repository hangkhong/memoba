# System contracts

This reference describes the implemented data and runtime contracts. [Evaluation status](evaluation.md) separates the prior OpenAI runtime check from semantic evaluation. The text agent and Vercel deployment still need live acceptance evidence.

## Runtime

The app uses Node.js 24, ESM, TypeScript, npm, and Next.js App Router. AI SDK 7 provides the agent loop. The provider registry selects reasoning and embedding providers independently. OpenAI reasoning uses Responses with low effort. Provider options apply to generation and correction.

Local Supabase uses project CLI `2.122.0`, the native experimental stack, and Postgres 17. Endpoint configuration comes from CLI JSON output. SQL migrations and generated database types define storage.

Runtime and input limits are owned by [`executionLimits` and `inputLimits`](../../src/lib/contracts/limits.ts). Database admission applies defensive bounds. A run uses the persisted deadline for model, tool, and validation work. New investigation stops when the synthesis reserve begins or the tool or step budget is exhausted. One correction can run within the same deadline. Cancellation and the hard deadline abort unfinished operations; terminal persistence has a separate bounded attempt.

Both analysis routes export `maxDuration = 300`. The hosted run deadline is `hostedDeadlineMs` in `limits.ts`, shorter than the function ceiling. On Vercel, the application anchors its cutoff to handler entry and passes an absolute cutoff to admission. The implementation leaves additional admission and clock headroom inside the configured hosted limit. SQL clamps the persisted deadline to that cutoff and rejects an expired cutoff. Refresh reconciles expired runs. The deployed project settings, clock alignment, stream behavior, and effective host duration have not been verified.

## Input and answer formats

[`analysis/schema.ts`](../../src/modules/analysis/schema.ts) owns these request shapes:

- Version 2 stores the raw message and a bounded ordered history of user and assistant messages. New chat turns use this shape. The server constructs and saves the snapshot before admission.
- Version 1 is the legacy `NormalizedRequest`, with template, objective, context, constraints, concepts, and unknowns. Readers preserve historical runs. New attempts convert that request to a version 2 snapshot and use the text agent.

History includes previous user text and completed assistant answers, including legacy briefs. Assistant text is conversation context, not evidence. A history that cannot fit the limits is rejected instead of truncated. A new chat can carry forward the restrictions that still matter.

[`briefs/schema.ts`](../../src/modules/briefs/schema.ts) owns the legacy structured brief and version 2 text answer. A text answer stores the prose and a server-derived mapping from run-scoped markers to evidence IDs. Saved source snapshots retain case, revision, section, text, and metadata. Readers check current access before returning source content. A marker from an earlier run cannot resolve in a later run.

## Knowledge tools

Version 2 exposes two model-facing tools:

| Tool | Input | Result |
|---|---|---|
| `search_cases` | Natural-language query | Grouped case previews and explicit empty, partial, no-progress, or error states |
| `read_case` | Up to three case IDs and optional section keys | A header per case (title, template, outcome state, observed outcome) followed by the requested sections, with markers for content delivered in this run |

Search uses the knowledge service's hybrid keyword and vector retrieval. It returns previews, not citeable evidence, with at most `searchSectionsPerCase` sections per case so previews spread across cases. The run pins one revision per case. Repeated reads report when they add no content. Candidate and context limits can omit content; the tool reports that state. An embedding provider failure is an error, not an empty search or a keyword-only fallback. Archived cases and unpublished revisions are excluded from new retrieval.

A read no longer adds unrequested sections. Every read returns each case's observed outcome in a header; that text counts against the context budget and gets a marker like any other section. Requested sections follow in priority order (approach, observed outcome, problem, context, constraints, lessons, then template fields) across the cases in the call, so the lowest-priority sections are omitted first when a limit applies, and the result reports `CONTEXT_LIMIT`. Revision pinning, markers and repeated-read handling are unchanged.

Coverage comes from the run's tool events, not from model text. The run knowledge state records the distinct cases returned by successful searches, the distinct cases with at least one section delivered by `read_case`, and whether any search failed or returned a partial result. The app saves this with the version 2 answer as `coverage` (searched, previewed, read, search failed, and up to 10 unread titles) and renders one line above the answer from the saved field: how many of the cases the search found were read, a note when none were read, when nothing was found, or when the search was incomplete, and nothing when no search was made. Answers saved before this field existed have no coverage and show no line. The agent reads the most relevant cases rather than all of them. When the last model step's input reaches 80% of `maxModelInputTokens`, the run removes the tools, records a `context` activity event with code `INPUT_CEILING`, and the model must answer from what it has read.

The model cannot select a workspace, issue SQL, or write data. Case text and prior assistant text are treated as data. Validation checks each citation marker against disclosed read content and current access. It can request one correction for invalid output. Marker validation does not establish that a source supports a claim.

Relation data remains stored for historical use. The text agent does not expose relation expansion as a tool.

## Case drafting

Import turns pasted notes into a form draft with one structured model call. The call has no tools, no retries, no persistence, and the `draftDeadlineMs` deadline from `limits.ts`. Notes and chosen file names are sent as untrusted data; file contents are never read or sent. The draft contains only fields the notes state, an `unknown` outcome unless a result is described, and the list of required sections still missing. A person reviews it and saves through `POST /api/cases`. The route logs request ID, duration, usage, and result kind, not note text.

## Answer shape

When an answer draws on cases the agent read, it uses three short sections: how similar cases went, what is different this time, and a suggested next step. After a successful search with no relevant case, it says so and omits the first section. Clarifications and direct general answers do not use the sections. Answers are in English. The instructions are `textInstructions` in [`agent.ts`](../../src/modules/analysis/agent.ts).

## Case rules

The two templates are Product/Delivery and CS/Operations. A case requires title, problem, context, approach, and outcome state. The outcome is `achieved`, `not_achieved`, or `unknown`; a known outcome also requires outcome details. Constraints, lessons, template-specific fields, sources, and concepts are optional. [`caseInputSchema`](../../src/modules/cases/schema.ts) owns the field validation and caps.

Concept types are `problem_type`, `system`, `approach`, and `constraint`. Direct links are `related_to`, `contrasts_with`, and `supersedes`. Links stay within a workspace. Supersedes links cannot form cycles. Source URLs use HTTP or HTTPS and are not fetched automatically.

Case content revisions are immutable. Indexing includes nonempty sections. Publication requires the expected sections to be indexed and does not replace the published revision until the new revision is ready. Retry preserves the revision and reports the returned index state. Archive is transactional. Historical citations retain their source revision subject to access checks.

SQL JSON constraints are generated from the owning Zod schemas with `npm run db:contracts -- <new-migration.sql>`. Postgres also checks publication, admission, and evidence integrity for direct RPC calls.

## Persistence and access

The main entities are `workspaces`, `workspace_members`, `cases`, `case_revisions`, `case_sections`, `concepts`, `revision_concepts`, `case_links`, `conversations`, `conversation_turns`, `analysis_runs`, and `briefs`.

Case links change only through the RPCs `link_cases`, `update_case_link` (relation and reason, atomically) and `unlink_cases`. Each checks membership, locks the workspace, and bumps `knowledge_version`. Editing to `supersedes` re-runs the cycle check. Removing a `supersedes` link does not restore an archived case.

Membership is established before the demo. Public sign-up does not enroll a member. Runtime operations derive user and workspace from verified server context. RLS and transactional RPCs enforce workspace access. Workspace members can read conversations; only the author can append turns or admit attempts.

A turn is saved before model availability and run admission. Missing model access leaves the question saved without creating a run. Turn creation and attempt admission have separate idempotency keys. Admission checks the latest parent, prevents concurrent runs in one conversation, and enforces the workspace quota. A failed, cancelled, or timed-out attempt can be retried as a new run on the latest turn. Existing independent runs retain a null turn reference.

A text run saves the final answer, cited source snapshots, usage, and terminal state. Activity comes from actual tool and run events. Refresh reads saved state and does not restart generation. The stream is request-bound; background continuation and durable resume are not supported.

The vector migration, stored vectors, and query embedding model use matching model IDs and dimensions. Supported profiles are `gemini-embedding-2` and `text-embedding-3-small`, both at 1536 dimensions. Search filters keyword and semantic candidates by profile. A model change requires indexed replacement revisions through `npm run ai:migrate-embeddings`, with the app stopped until the active corpus is verified.

## Demo workspace

Reviewers sign in with the provided account on the normal form; there is no separate demo sign-in route. `DEMO_EMAIL` and `DEMO_PASSWORD` are script inputs only, and the seed converges the demo user's password to `DEMO_PASSWORD` on every run. Public sign-up stays disabled. `public.reset_demo_workspace(w, keep_case_ids)` removes conversations, runs, briefs, links, and every case not in the keep list, restores archived kept cases, and bumps the knowledge version. Only `service_role` can execute it. `npm run demo:reset` calls it for the workspace `Memory Bank Demo` only, keeps cases whose latest title matches the seed corpus in [`evals/demo/corpus.ts`](../../evals/demo/corpus.ts), then reruns the incremental seed. When given the app URL, `scripts/seed-conversations.ts` signs in through the app and creates one conversation per entry of `demoConversations` in [`evals/demo/prompts.ts`](../../evals/demo/prompts.ts) with a real completed run, so the demo shows exactly three conversations. The seed compares each fixture with the case's latest revision and saves a new revision only when the content differs, so edited fixtures land in an existing database and a visitor's edit to a seed case is restored; unchanged cases cost no embeddings.

## States and HTTP

Runs end as `complete`, `gap_report`, `failed`, `cancelled`, or `timed_out`. A completed run does not prove semantic support. Logs include operational IDs, counts, timing, errors, and usage, and exclude case text and secrets.

| Endpoint | Result |
|---|---|
| `GET /api/conversations` | Recent conversations in the verified workspace |
| `POST /api/conversations` | Idempotent conversation creation |
| `GET /api/conversations/:id` | Authorized turns, attempts, and permitted answers |
| `POST /api/conversations/:id/turns` | Saved text turn before model access |
| `POST /api/conversations/:id/turns/:turnId/analyses` | Attempt through the shared analysis service and UI stream |
| `POST /api/cases` | Saved IDs and index state |
| `POST /api/cases/drafts` | Unsaved case draft and missing sections, or `503` when AI is unavailable |
| `PATCH /api/cases/:id` | New revision |
| `POST /api/cases/:id/revisions/:revisionId/reindex` | Idempotent index state |
| `POST /api/cases/:id/archive` | Archived case |
| `GET /api/cases/:id` | Authorized case detail |
| `POST /api/cases/:id/links` | Same-workspace typed link |
| `POST /api/analyses` | AI SDK UI stream with run ID |
| `GET /api/analyses/:id` | Authorized run state, events, and result |
| `GET /api/briefs/:id` | Saved answer or legacy brief and permitted evidence |
| `PATCH /api/briefs/:id` | Edited text and saved state |

Authenticated responses are private and use `no-store`. Errors use `400` for invalid input, `401` for missing identity, `404` for inaccessible resources, `409` for conflicting requests, and `429` for concurrent quota.
