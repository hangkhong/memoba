# Architecture foundation

Memory Bank uses one Next.js application, one Supabase database, and one AI SDK agent. A PM builds the MVP in seven days.

The [product design](../superpowers/specs/2026-10-27-memory-bank-design.md) defines scope. The [system contracts](../reference/system-contracts.md) define runtime limits and data rules. The [local plan](../superpowers/plans/2026-10-27-local-v0.md) defines implementation tasks.

## Framework reuse

Next.js provides pages, route handlers, server rendering, and the build. shadcn/ui provides UI components. React Hook Form and Zod handle forms and boundary validation.

Supabase provides Auth, Postgres, pgvector, migrations, and generated database types. The app uses its official SSR clients and SDK. A second ORM would duplicate the schema without helping this release.

AI SDK 7 provides model calls, tools, streams, and the agent loop. Memory Bank owns case rules, retrieval policy, evidence contracts, and analysis budgets.

The chat presentation adapts the Eve template's conversation viewport, composer behavior, and compact activity. [Eve chat integration](eve-chat-integration.md) records the source revision and the boundary between reusable UI and Memoba's execution services.

Vitest checks domain rules. pgTAP checks SQL and access. Playwright checks the local case-to-brief flow. Live-model evaluation checks semantic support.

## Module boundaries

`src/modules/cases` owns templates and revisions. `src/modules/knowledge` owns search, case reads, relation expansion, and evidence assembly. `src/modules/analysis` owns planning, budgets, the agent, and activity. `src/modules/briefs` owns output validation and saved edits.

`src/modules/conversations` owns ordered user turns and immutable request snapshots. Runs link to turns, and briefs remain attached to runs. The shared workspace shell owns the chat connection, so navigation between Chat and Knowledge Hub does not unmount an active stream. Refresh reads persisted state and does not restart generation.

Chat is the default workspace view. Knowledge Hub reuses the case authoring and publication services. Follow-ups carry user-confirmed structured context and constraints into a new run. Prior assistant answers are not included as evidence or model history in the foundation release. Resolving references to prior proposals is deferred to a feature branch.

Routes and components call application services. Agent tools call the same knowledge services as initial retrieval. Pure rules do not import framework or database clients.

The Pele [component diagram](diagrams/architecture.svg) and [analysis flow](diagrams/harness.svg) have editable `.mmd` sources beside them.

## Evidence before reasoning

The app normalizes the structured request, builds a plan, retrieves evidence, and prepares context before it calls the reasoning agent.

The agent can request more evidence through typed tools. Each result records its case, section, revision, and retrieval path. Several cases can contribute different parts of a recommendation.

Citation validation checks provenance. Evaluation checks whether a source supports a claim. The optional small-model planner stays off until a comparison shows enough benefit to justify its cost.

## Postgres relationships

Concepts and typed case links support bounded SQL traversal. A separate graph service would add synchronization and access rules for a small corpus.

Content revisions are immutable. A new revision becomes published only after indexing succeeds. An unfinished edit cannot replace the source used by retrieval.

## Local runtime

The project uses native Supabase with CLI `2.122.0`, an explicit experimental exception to the stable-dependency rule. The plan verifies the native services before application work depends on them.

One native local project fits the first checkpoint. Its endpoint configuration comes from the CLI. Docker and fixed local ports are not required.

## Delivery trade-offs

The first release uses bounded requests for indexing and analysis. It stores state and reports failures but does not resume interrupted generation. Durable jobs become useful when measured workloads require resume.

The local checkpoint uses six reviewed demo cases and two real-model requests. The full challenge suite follows the design spec.

## Decisions and sources

- [ADR-0001: Framework-first application](adr/0001-framework-first-single-app.md)
- [ADR-0002: Postgres knowledge and evidence](adr/0002-postgres-knowledge-evidence.md)
- [ADR-0003: Bounded analysis with AI SDK](adr/0003-bounded-harness-ai-sdk.md)
- [shadcn forms](https://ui.shadcn.com/docs/forms/react-hook-form)
- [Supabase native runtime](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes)
- [AI SDK agents](https://ai-sdk.dev/docs/agents/building-agents)
