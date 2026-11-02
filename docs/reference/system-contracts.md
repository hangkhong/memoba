# System contracts

This reference describes the implemented data and runtime contracts. For why they exist, read [How the agent answers a question](../engine/how-the-agent-answers.md). The [evaluation record](evaluation.md) holds measured results.

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

[`briefs/schema.ts`](../../src/modules/briefs/schema.ts) owns the legacy structured brief and version 2 text answer. A text answer stores the prose and a server-derived mapping from run-scoped markers to evidence IDs. Saved source snapshots retain the case or document, revision, section, text, and metadata. Evidence is a union: case evidence keeps its original shape, and document evidence has `source: "document"` and no outcome, so answers saved before documents existed still parse and need no data migration. Readers check current access before returning source content. A marker from an earlier run cannot resolve in a later run.

## Knowledge tools

Version 2 exposes three model-facing tools:

| Tool | Input | Result |
|---|---|---|
| `search_knowledge` | Natural-language query | `{ kind, cases, documents }`; each source is its own result with its own empty, partial, no-progress, or error state |
| `read_case` | Up to three case IDs and optional section keys | A header per case (title, template, outcome state, observed outcome) followed by the requested sections, with markers for content delivered in this run |
| `read_document` | One document ID and optional block numbers | A header (title, type, area, owner, effective date) and whole blocks of sections with markers, plus `omittedBlocks` |

Runs saved before `search_knowledge` replaced `search_cases` keep their `search_cases` events, and the activity view still words them.

Search embeds the query once and runs the case search and the document search as two RPCs that settle separately. An embedding failure is an error for both sources, not an empty search or a keyword-only fallback. If one RPC fails, the other source's results stand and the failed source reports its error, so a failed source is never read as absence. Case previews return at most `searchSectionsPerCase` sections per case. Document results are cards: title, description, type, area, owner, effective date, an outline of numbered blocks, and the headings that matched. At most `documentCandidates` documents return per search. Previews and cards are not citeable evidence. Archived cases and documents and unpublished case revisions are excluded from new retrieval.

The run keeps separate budgets. Case search and read limits count only case evidence; documents have their own candidate quota, preview pool, and read pool in [`limits.ts`](../../src/lib/contracts/limits.ts). `citationLimit` is the sum of the two read pools and caps the citations in an answer and the snapshots `finish_analysis` accepts. The run pins one revision per case and per document. Repeated reads report when they add no content.

A case read adds no unrequested sections. Every read returns each case's observed outcome in a header; that text counts against the context budget and gets a marker like any other section. Requested sections follow in priority order (approach, observed outcome, problem, context, constraints, lessons, then template fields) across the cases in the call, so the lowest-priority sections are omitted first when a limit applies, and the result reports `CONTEXT_LIMIT`.

A document read delivers each block whole or lists it in `omittedBlocks`; context never cuts inside a block. Without `blocks`, it reads every block that fits. A partial result reports `CONTEXT_LIMIT`. The summary section that makes a document searchable is never read, disclosed, or cited. The header and every section of a document read carry its version and effective date, and the answer names them when it relies on a process.

Per-source state comes from tool events, not from model text. The search event's free-string `code` records each source (`cases:found:3;documents:none:0`, with `found`, `none`, `partial`, `failed`, or `repeat`), and the activity view words it. The app renders no coverage line above the answer. The run records coverage from tool events and saves it with the version 2 answer as `coverage` for evaluation: cases searched, previewed and read, whether a search failed, up to 10 unread titles, and an optional `documents` summary of the same counts. Answers saved before this field existed have none. When the last model step's input reaches the share of `maxModelInputTokens` set by `synthesisInputRatio` in [`agent.ts`](../../src/modules/analysis/agent.ts), the run removes the tools, records a `context` activity event with code `INPUT_CEILING`, and the model must answer from what it has read.

The model cannot select a workspace, issue SQL, or write data. Case text, document text, and prior assistant text are treated as data. Validation checks each citation marker against disclosed read content and current access. A citation under `## What the process says` must be a document and one under `## How similar cases went` must be a case; a misplaced marker fails with `MISPLACED_CITATION` and takes the same single correction as an invalid one. Marker validation does not establish that a source supports a claim.

Relation data remains stored for historical use. The text agent does not expose relation expansion as a tool.

## Process documents

A document has a name, a description that says when to use it, Markdown content, a type, an area, an owner, an effective date, and optional sources. [`documentInputSchema`](../../src/modules/documents/schema.ts) owns the fields and caps. The types are `policy` (required), `procedure` (required steps), and `guideline` (advisory). The areas are Product, Engineering, Operations, Finance, Legal, and People. A version is a real, stored fact: `document_revisions.version` is an integer assigned under the document lock, unique per document, and immutable, and it is what evidence, search cards, and read results report. The first version's change note defaults to "First published"; every later version requires a `changeNote` that says what changed and why. The note, the author's email, and the version are stored with the revision and are not embedded and not evidence. Each version has its own `effectiveFrom`; a date in the future is rejected, since publishing replaces the current version at once (one day of slack covers time zones). Scheduled versions are deferred.

[`splitDocument`](../../src/modules/documents/split.ts) turns the content into blocks and sections; the form preview and the server run the same function. A block is the subtree of the shallowest heading level that occurs at least twice, and text before the first split heading is its own block. Inside a block, whole atoms (paragraph, table, code fence, list item) are packed into sections of at most `inputLimits.text` characters; lists split only between items. A block or atom over its limit is rejected at publish, naming the heading. Section text is the source lines unchanged, so every non-blank source line appears once, in order.

`publish_document` embeds first and then stores the revision (with its version and note), its sections, and the new published pointer in one transaction, so there is no pending or failed index state and no reindex route. Identical content under the same embedding model returns `unchanged` with the current version and needs no note. A `summary` section holds the title, description, and metadata and is searchable only. `body` sections hold the text and embed `title > heading path` plus the text. Revisions and sections are immutable, and members read them through RLS. Archiving removes a document from new retrieval. A saved citation keeps the version it cited, and `finish_analysis` checks that version against the section. Members can read every version, current or earlier, and `/workspace/knowledge/documents/:id?version=N` shows an earlier one read only. `reset_demo_workspace` deletes every document of the workspace, and the seed recreates the demo documents, so a demo seed without an embedding model fails.

## Case drafting

Import turns pasted notes into a form draft with one structured model call. The call has no tools, no retries, no persistence, and the `draftDeadlineMs` deadline from `limits.ts`. Notes and chosen file names are sent as untrusted data; file contents are never read or sent. The draft contains only fields the notes state, an `unknown` outcome unless a result is described, and the list of required sections still missing. A person reviews it and saves through `POST /api/cases`. The route logs request ID, duration, usage, and result kind, not note text.

## Answer shape

The answer template, its heading order, and the rules for empty and failed sources are `textInstructions` in [`agent.ts`](../../src/modules/analysis/agent.ts). The product reasons for the split between process and cases are in [How an answer stays checkable](../engine/how-an-answer-stays-checkable.md). A `length` finish fails the run, so `outputTokens` in [`limits.ts`](../../src/lib/contracts/limits.ts) must cover the longest answer.

## Case rules

The two templates are Product/Delivery and CS/Operations. A case requires title, problem, context, approach, and outcome state. The outcome is `achieved`, `not_achieved`, or `unknown`; a known outcome also requires outcome details. Constraints, lessons, template-specific fields, sources, and concepts are optional. [`caseInputSchema`](../../src/modules/cases/schema.ts) owns the field validation and caps.

Concept types are `problem_type`, `system`, `approach`, and `constraint`. Direct links are `related_to`, `contrasts_with`, and `supersedes`. Links stay within a workspace. Supersedes links cannot form cycles. Source URLs use HTTP or HTTPS and are not fetched automatically.

Case content revisions are immutable. Indexing includes nonempty sections. Publication requires the expected sections to be indexed and does not replace the published revision until the new revision is ready. Retry preserves the revision and reports the returned index state. Archive is transactional. Historical citations retain their source revision subject to access checks.

SQL JSON constraints are generated from the owning Zod schemas with `npm run db:contracts -- <new-migration.sql>`. Postgres also checks publication, admission, and evidence integrity for direct RPC calls.

## Persistence and access

The main entities are `workspaces`, `workspace_members`, `cases`, `case_revisions`, `case_sections`, `documents`, `document_revisions`, `document_sections`, `concepts`, `revision_concepts`, `case_links`, `conversations`, `conversation_turns`, `analysis_runs`, and `briefs`.

Case links change only through the RPCs `link_cases`, `update_case_link` (relation and reason, atomically) and `unlink_cases`. Each checks membership, locks the workspace, and bumps `knowledge_version`. Editing to `supersedes` re-runs the cycle check. Removing a `supersedes` link does not restore an archived case.

Membership is established before the demo. Public sign-up does not enroll a member. Runtime operations derive user and workspace from verified server context. RLS and transactional RPCs enforce workspace access. Workspace members can read conversations; only the author can append turns or admit attempts.

A turn is saved before model availability and run admission. Missing model access leaves the question saved without creating a run. Turn creation and attempt admission have separate idempotency keys. Admission checks the latest parent, prevents concurrent runs in one conversation, and enforces the workspace quota. A failed, cancelled, or timed-out attempt can be retried as a new run on the latest turn. Existing independent runs retain a null turn reference.

The conversation never asks the user to start the agent: sending a message starts it, and opening or refreshing a conversation never starts a model call. A latest turn with no run, or with a failed, cancelled, or timed-out run, reads "Memoba could not respond" (or that Memoba is unavailable and the question is saved) with one "Try again" button for the owner; an earlier turn without an answer reads "No response". The word "analysis" does not appear in conversation copy.

Only the author can delete a conversation, through `delete_conversation`: it times out expired runs, refuses (`23505`, HTTP 409) while one is live, and removes the briefs, runs, turns, and conversation in one transaction. Turns stay immutable: the trigger on `conversation_turns` blocks every update, and blocks a delete unless the RPC has named that conversation in the transaction-local setting `memoba.deleting_conversation`. No role has a delete grant on these tables.

A text run saves the final answer, cited source snapshots, usage, and terminal state. Activity comes from actual tool and run events. Refresh reads saved state and does not restart generation. The stream is request-bound; background continuation and durable resume are not supported.

The vector migration, stored vectors, and query embedding model use matching model IDs and dimensions. Supported profiles are `gemini-embedding-2` and `text-embedding-3-small`, both at 1536 dimensions. Search filters keyword and semantic candidates by profile. A model change requires indexed replacement revisions through `npm run ai:migrate-embeddings`, with the app stopped until the active corpus is verified.

## Demo workspace

Reviewers sign in with the provided account on the normal form. There is no separate demo sign-in route, and public sign-up stays disabled. `DEMO_EMAIL` and `DEMO_PASSWORD` are script inputs only.

The fixtures are in [`evals/demo`](../../evals/demo): cases in `corpus.ts`, process documents in `documents.ts`, and the suggested prompts and seeded conversations in `prompts.ts`. [`scripts/seed-demo.ts`](../../scripts/seed-demo.ts) converges the workspace `Northwind Ledger`, the demo user's password, and each case to its fixture. It saves a new revision only when the content differs, so unchanged cases cost no embeddings. `npm run demo:reset` calls `public.reset_demo_workspace(w, keep_case_ids)`, executable only by `service_role`, for the workspace with the fixed demo ID, then reruns the seed. [Deploy the demo](../how-to/deploy-demo.md#6-reset-between-reviewers) lists what the reset removes. When given the app URL, [`scripts/seed-conversations.ts`](../../scripts/seed-conversations.ts) creates one conversation per `demoConversations` entry with a real completed run.

## States and HTTP

Runs end as `complete`, `gap_report`, `failed`, `cancelled`, or `timed_out`. A completed run does not prove semantic support. Logs include operational IDs, counts, timing, errors, and usage, and exclude case text and secrets.

| Endpoint | Result |
|---|---|
| `POST /api/auth/login`, `POST /api/auth/logout` | Start or end the session |
| `GET /api/workspace` | The verified workspace context |
| `GET /api/conversations` | Recent conversations in the verified workspace |
| `POST /api/conversations` | Idempotent conversation creation |
| `GET /api/conversations/:id` | Authorized turns, attempts, and permitted answers |
| `DELETE /api/conversations/:id` | Permanently deletes the author's conversation with its turns, runs, and briefs. `404` for anyone else, `409` while a run is live (expired runs time out first) |
| `POST /api/conversations/:id/turns` | Saved text turn before model access |
| `POST /api/conversations/:id/turns/:turnId/analyses` | Attempt through the shared analysis service and UI stream |
| `POST /api/cases` | Saved IDs and index state |
| `POST /api/cases/drafts` | Unsaved case draft and missing sections, or `503` when AI is unavailable |
| `PATCH /api/cases/:id` | New revision |
| `POST /api/cases/:id/revisions/:revisionId/reindex` | Idempotent index state |
| `POST /api/cases/:id/archive` | Archived case |
| `POST /api/documents` | Published document, or `400` with the first problem, or `503` when no embedding model is configured |
| `PATCH /api/documents/:id` | New version (`changeNote` required), `400` without one, or `unchanged` for identical content |
| `POST /api/documents/:id/archive` | Archived document |
| `GET /api/documents/:id` | Authorized document detail with every revision |
| `GET /api/cases/:id` | Authorized case detail |
| `POST`, `PATCH`, `DELETE /api/cases/:id/links` | Create, edit, or remove a same-workspace typed link |
| `POST /api/analyses` | AI SDK UI stream with run ID |
| `GET /api/analyses/:id` | Authorized run state, events, and result |
| `GET /api/briefs/:id` | Saved answer or legacy brief and permitted evidence |
| `PATCH /api/briefs/:id` | Edited text and saved state |

Authenticated responses are private and use `no-store`. Errors use `400` for invalid input, `401` for missing identity, `404` for inaccessible resources, `409` for conflicting requests, and `429` for concurrent quota.
