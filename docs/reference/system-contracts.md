# System contracts

This reference defines domain behavior. The framework and identity checkpoint is implemented. Provider-dependent storage, retrieval, and analysis remain pending.

## Runtime

The app uses Node.js 24, ESM, TypeScript, npm, and Next.js App Router. AI SDK major 7 provides the agent loop. The Google provider connects directly to the Gemini API.

Local Supabase uses project CLI `2.122.0`, native runtime, experimental stack, and Postgres 17. Endpoints come from JSON output. Native Auth, pgvector, migration, and SQL smoke checks precede repository integration.

## Domain contracts

| Contract | Content |
|---|---|
| `NormalizedRequest` | Template/version, objective, context, typed constraints, concepts, unknowns |
| `RequestContext` | Verified user/workspace, knowledge version, run ID, deadline, limits |
| `RequestPlan` | Queries with purpose `method`, `conditions`, or `exceptions` |
| `EvidenceItem` | Evidence/case/revision/section IDs, excerpt, source metadata, retrieval path |
| `EvidenceBundle` | Deduplicated items, coverage gaps, warnings, context size |
| `ToolResult` | Discriminated success, empty success, or error with retryability |
| `DraftBrief` | Reusable approach, adjustments, conflicts, unknowns, next steps, references |
| `RunResult` | Terminal state, result or error, usage, timestamps |

The server creates `RequestContext`. The model cannot choose workspace IDs, SQL, table names, depth, or write operations.

## Tools

| Tool | Input | Service checks |
|---|---|---|
| `search_knowledge` | Query, purpose, concept filters | Scope, active published cases, caps, evidence registry |
| `read_case` | Case ID, section keys | Access, pinned revision, unavailable state |
| `expand_relations` | Seed IDs, allowed relation types | Same workspace, active targets, visited-set, caps |

Initial retrieval and tools use the same service. New evidence enters the run registry before citation. Search failure is an error, not empty success.

## Limits

Runtime and input limits are defined in [`executionLimits` and `inputLimits`](../../src/lib/contracts/limits.ts). That file owns the numeric values used by schemas, evidence assembly, and run budgets. Database admission and the live agent must consume the same limits when connected.

The planner is off by default. AbortSignal and call timeouts enforce the total deadline. SDK step limits alone do not stop a hanging call.

## Case rules

Core fields are title, problem, context, constraints, approach, outcome, lessons, source metadata, and concepts. Outcomes are `achieved`, `not_achieved`, or `unknown`.

Field and collection caps are defined in [`inputLimits`](../../src/lib/contracts/limits.ts). Source metadata allows at most 12 URL references per case, enforced by [`caseInputSchema`](../../src/modules/cases/schema.ts).

Product/Delivery adds deliverable, change scope, and deployment conditions. CS/Operations adds customer impact, handling conditions, and escalation notes. Template choice does not restrict retrieval by domain.

Concept types are `problem_type`, `system`, `approach`, and `constraint`. Direct links are `related_to`, `contrasts_with`, and `supersedes`. Links stay within a workspace. Supersedes links cannot form cycles.

Content revisions are immutable. A pending revision does not replace the published revision. Publication follows successful indexing. Retry does not duplicate sections. Archive is an explicit transactional action.

Archived cases and unpublished revisions do not enter new retrieval. Saved briefs retain source versions. Current access checks precede the return of saved excerpts.

## Persistence

The entities are `workspaces`, `workspace_members`, `cases`, `case_revisions`, `case_sections`, `concepts`, `revision_concepts`, `case_links`, `analysis_runs`, and `briefs`.

Membership is set up before the demo. Public sign-up does not enroll a member. Runtime queries use user scope and RLS. Save, publish, archive, and admission operations use transactional RPCs.

The vector migration, stored vectors, and query embedding model have matching model IDs and dimensions. A model change requires reindexing.

## States and errors

Runs contain intake, planning, retrieval, context, reasoning, and validation events. Terminal states are complete, gap report, failed, cancelled, or timed out. Incomplete analysis is not complete output.

Idempotency keys prevent duplicate analysis. Expired leases become timed out. Refresh reads persisted state and does not promise generation resume.

Validation checks schema, the evidence registry, source revisions, and access. Semantic support needs evaluation. Edits have separate provenance. Generated briefs are not observed case outcomes.

## HTTP contracts

| Endpoint | Result |
|---|---|
| `POST /api/cases` | Saved IDs and index state |
| `PATCH /api/cases/:id` | New revision |
| `POST /api/cases/:id/revisions/:revisionId/reindex` | Idempotent index state |
| `POST /api/cases/:id/archive` | Archived case |
| `GET /api/cases/:id` | Authorized detail |
| `POST /api/analyses` | AI SDK UI stream with run ID |
| `GET /api/analyses/:id` | Authorized state, events, result |
| `GET /api/briefs/:id` | Generated/edited brief and permitted evidence |
| `PATCH /api/briefs/:id` | Edited/saved state |

Errors use `400` for invalid input, `401` for missing identity, `404` for inaccessible resources, `409` for duplicate analysis keys, and `429` for concurrent quota.

Authenticated responses are private and use `no-store`. Within-run caches include scope and knowledge version. Source URLs use HTTP or HTTPS and are not fetched automatically. Logs exclude source text and credentials.
