# Architecture foundation

The [text-first product design](../superpowers/specs/2026-10-29-text-agent-design.md) defines the demo scope.

Memoba uses one Next.js application, one Supabase database, and one AI SDK agent for a PM's seven-day demo. The [agent engine plan](../superpowers/plans/2026-10-29-agent-engine-simplification.md) defines the current work. [System contracts](../reference/system-contracts.md) define the runtime and data rules.

## Frameworks and boundaries

Next.js provides pages, route handlers, server rendering, and the build. shadcn/ui provides UI components. React Hook Form and Zod handle forms and boundary validation. Supabase provides Auth, Postgres, pgvector, migrations, and generated database types. The app uses the official SSR clients. AI SDK 7 provides model calls, tools, streams, and the agent loop.

`src/modules/cases` owns templates and revisions. `src/modules/knowledge` owns search, case reads, revision pinning, and evidence disclosure. `src/modules/analysis` owns the run budget, model loop, tools, and activity. `src/modules/briefs` validates and saves answers with evidence. `src/modules/conversations` owns ordered turns and immutable input snapshots.

Chat is the default workspace view. Knowledge Hub reuses the case authoring and publication services. The shared workspace shell owns the chat connection, so navigation does not unmount an active stream. Refresh reads persisted state and does not restart generation. The presentation adapts the Eve template as described in [Eve chat integration](eve-chat-integration.md).

## Text questions and evidence

A new chat turn stores the user's text and bounded prior conversation as a versioned snapshot. Earlier assistant text is context, not case evidence. The model can answer, ask for clarification, or call `search_cases` and `read_case`. It chooses whether to investigate rather than receiving mandatory pre-retrieval results.

Search groups previews of active, published cases. A read supplies sections and surrounding case context from a pinned revision. Only sections delivered by a read receive run-scoped citation markers. Validation resolves markers to disclosed sources and checks access before the app saves the answer and source snapshots. This establishes citation identity, not semantic support or advice quality.

Readers accept legacy structured requests and briefs so historical runs remain available. New attempts, including retries of legacy turns, use a version 2 snapshot and the text agent. Generated advice remains separate from observed case outcomes.

## Storage and execution

Concepts and typed case links use Postgres. Content revisions are immutable. A new revision becomes published only after its nonempty sections are indexed. An unfinished edit cannot replace the published source used by retrieval.

The persisted admission deadline bounds model calls, tool work, and citation correction. The Vercel route also applies a request-entry cutoff with headroom for setup and persistence. The hosted cutoff and synthesis reserve are runtime policies to verify with a deployment, not proof of hosted behavior. The app stores terminal state and reconciles expired runs on later reads; it does not resume interrupted generation.

Local development uses the project-pinned Supabase CLI `2.122.0` with the native experimental stack. Endpoint configuration comes from CLI JSON output. Docker and fixed local ports are not prerequisites.

## Verification and prior decisions

Vitest checks domain behavior, pgTAP checks SQL and access, and Playwright checks user journeys. Live-model evaluation and reviewed examples are needed to assess whether answers use evidence correctly. See [evaluation status](../reference/evaluation.md) for the recorded results.

The earlier ADRs record the foundation decisions; their fixed-pipeline descriptions predate the text agent:

- [ADR-0001: Framework-first application](adr/0001-framework-first-single-app.md)
- [ADR-0002: Postgres knowledge and evidence](adr/0002-postgres-knowledge-evidence.md)
- [ADR-0003: Bounded analysis with AI SDK](adr/0003-bounded-harness-ai-sdk.md)
