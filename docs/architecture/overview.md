# Architecture overview

Memoba is one Next.js application, one Supabase database, and one AI SDK agent. The aim was to spend the build on the engine and the evidence rules, and to let frameworks own the plumbing.

## How the code is organized

| Path | Owns |
|---|---|
| `src/app` | Pages and route handlers, kept thin |
| `src/modules/cases` | Templates, revisions, and the draft from pasted notes |
| `src/modules/documents` | Process documents: the Markdown splitter, publishing, and the Documents UI |
| `src/modules/knowledge` | Search, reads, version pinning, and which text the model may see |
| `src/modules/analysis` | The run budget, agent loop, tools, and activity |
| `src/modules/briefs` | Citation validation, saved answers, and evidence display |
| `src/modules/conversations` | Ordered turns, input snapshots, and the chat connection |
| `src/modules/dashboard` | The Dashboard, on sample data |
| `src/modules/docs` | The in-app Docs: reads `docs/product` and `docs/engine`, and serves them at `/docs` and `/workspace/docs` |
| `src/components` | UI shared by cases and documents, and the landing page |
| `src/lib/contracts/limits.ts` | Every runtime and input limit |
| `supabase/migrations` | Schema, row-level security, and the RPCs that enforce access |

A question flows through `POST /api/conversations/:id/turns`, which saves it first, and then `POST /api/conversations/:id/turns/:turnId/analyses`, which admits a run. [`runtime.ts`](../../src/modules/analysis/runtime.ts) wires the run, [`harness.ts`](../../src/modules/analysis/harness.ts) owns its lifecycle, and [`agent.ts`](../../src/modules/analysis/agent.ts) owns the model loop. The chat connection lives in the workspace shell, so moving between pages does not end a stream. [How the agent answers a question](../engine/how-the-agent-answers.md) explains the run itself.

Runtime access is enforced twice. The server derives the user and workspace from the session, and row-level security and RPCs enforce the same boundary in SQL.

## Where the engine rules live

The reader pages in `docs/engine` describe the rules in plain words and name no code. This table points an engineer from each rule to its owner.

| Rule | Owner |
|---|---|
| The agent's instructions | [`agent.ts`](../../src/modules/analysis/agent.ts) |
| Every runtime and input limit | [`limits.ts`](../../src/lib/contracts/limits.ts) |
| The three agent tools: `search_knowledge`, `read_case`, `read_document` | [`tools.ts`](../../src/modules/analysis/tools.ts), calling the knowledge service |
| The citation marker, such as `[S:run:12]`, issued when a read delivers a section | [`service.ts`](../../src/modules/knowledge/service.ts) in `src/modules/knowledge` |
| Prior turns as messages, and the bound on history | `boundHistory` in [`service.ts`](../../src/modules/conversations/service.ts) in `src/modules/conversations` |
| The conversation's held evidence | `earlierSources` in [`ledger.ts`](../../src/modules/conversations/ledger.ts), `holdSources` in [`service.ts`](../../src/modules/knowledge/service.ts), and the prompt block in [`held.ts`](../../src/modules/analysis/held.ts) |
| The check on a finished draft | `validateTextAnswer` in [`validation.ts`](../../src/modules/briefs/validation.ts) |
| Case fields and template rules | `caseInputSchema` in [`schema.ts`](../../src/modules/cases/schema.ts), shared by the form and the route handlers |
| Document splitting along headings | `splitDocument` in [`split.ts`](../../src/modules/documents/split.ts) |
| Document publishing in one transaction | `publish_document` in [`20261031010000_process_documents.sql`](../../supabase/migrations/20261031010000_process_documents.sql) |
| Hybrid ranking for cases | `search_knowledge` in [`202610300002_search_diversity.sql`](../../supabase/migrations/202610300002_search_diversity.sql) |
| Hybrid ranking for documents | `search_knowledge_documents` in [`20261031010000_process_documents.sql`](../../supabase/migrations/20261031010000_process_documents.sql) |
| Keyword ranking | Postgres `ts_rank_cd` over the `simple` text configuration, so words are not reduced to a root |
| Data, tool, state, and API rules | [System contracts](../reference/system-contracts.md) |
| What was measured | [Evaluation record](../reference/evaluation.md) |

## Decisions, and what would reopen them

| Decision | Why | Rejected | Reopen when |
|---|---|---|---|
| One TypeScript app on Vercel | One deployment and one set of types from form to tool | A separate Python API; a full chatbot starter; a custom agent runtime | A service needs a special runtime, or a bottleneck is measured |
| Everything in Postgres | One place for permissions and transactions across cases, vectors, and evidence | Vector-only search, which loses exact terms; a graph database, which adds a service and sync | Hybrid search recall falls short on a real corpus |
| One bounded agent with three tools | Lets the model choose its reading while the application holds the rules | A fixed search-then-generate pipeline; LangGraph; multiple agents | A second agent improves evaluation results, or durable checkpoints are needed |
| Run tied to the request | Simple, with saved state for refresh | Durable background execution | Runs often outlast their request |
| No runtime mock of models or search | A missing service is reported as missing | Fallback answers | Not planned. A fake answer in this product would be a defect |

Typed concepts and case links exist in the schema and the case pages. The chat agent passes no concepts to search and has no relation tool, so they don't affect answers today.

## The stack

Next.js App Router, TypeScript, and Node.js 24 run the app. shadcn/ui provides components, and React Hook Form with Zod handles forms and boundary validation. Supabase provides Auth, Postgres, pgvector, migrations, and generated database types. AI SDK 7 provides model calls, tools, streams, and the agent loop. The model configuration is `AI_REASONING_MODEL` and `AI_EMBEDDING_MODEL` in [`.env.example`](../../.env.example).

Local development uses the project-pinned Supabase CLI with its native stack, and hosted runs use Vercel and Supabase Cloud. See [Run locally](../how-to/run-locally.md) and [Deploy the demo](../how-to/deploy-demo.md).

Vitest checks domain behavior, pgTAP checks SQL and access, and Playwright checks user journeys. None of these calls a paid model. Live model runs are recorded separately in the [evaluation record](../reference/evaluation.md).

## The next engine step

Batch reading and case cards are the two options for questions that compare many cases. [How the agent answers a question](../engine/how-the-agent-answers.md#the-next-engine-step) describes them for readers. Both wait until the run's record of sources found and sources read shows that the partial view is the real limit.
