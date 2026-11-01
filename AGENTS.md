# Work in this repository

## Read the project contracts

The code is the source of truth. If a document and the code disagree, fix the document.

Read `docs/README.md` for the map of the documentation.
Read `docs/product` for why the product is built this way and what is out of scope.
Read `docs/engine` for how the engine works, and `docs/architecture/overview.md` for modules and decisions.
Read `docs/reference/system-contracts.md` for states, tools, and data rules.

Build for one PM, one demo workspace, and a seven-day challenge. Keep the two fixed case templates. Accept natural-language requests.

## Use the existing frameworks

Use Next.js App Router, TypeScript, Node.js 24, and npm. Commit `package-lock.json` after bootstrap.
Add UI components through the shadcn CLI. Use React Hook Form with Zod for forms.
Use Supabase Auth, the official SSR clients, SQL migrations, and generated database types.
Use the project-pinned Supabase CLI with its native runtime for local development. Enable the experimental stack. Read endpoints from JSON output. Docker and fixed ports are not prerequisites.
Use AI SDK 7 for model calls, tools, streams, and the agent loop.
Use Vitest, AI SDK test helpers, pgTAP, and Playwright for the checks each change needs.

Use stable releases and read the installed framework documentation before using unfamiliar APIs. Add a dependency only when an existing dependency does not cover the requirement.
The Supabase native stack is an explicit experimental exception. Pin CLI `2.122.0` and smoke-test Auth, pgvector, migrations, and SQL tests.

## Keep the module boundaries

Put product modules in `src/modules/cases`, `src/modules/documents`, `src/modules/knowledge`, `src/modules/analysis`, `src/modules/briefs`, and `src/modules/dashboard`. Put UI pieces that cases and documents share in `src/components`.
Keep route handlers and UI components thin. Put business rules in typed functions and services.
Make agent tools call the knowledge service.
Keep SDK and database types behind adapters. Use domain contracts between modules.
Create files when a task needs them. Do not create empty modules for future features.

## Preserve evidence and access

Derive the user and workspace from verified server context. Check membership for every operation. Enforce RLS in SQL and RPCs.
Treat network input, environment values, database results, and model output as `unknown` until parsed at the boundary.
Infer TypeScript types from Zod schemas. Use discriminated unions for success, empty, partial, and error states.
Avoid `any`, unchecked casts, and duplicate runtime validation inside typed functions.

Keep case content revisions immutable. Publish a revision only after its index is ready.
Keep citations tied to a section and revision. Check access before returning saved evidence text.
Exclude archived cases from new retrieval. Preserve authorized historical citations.
Keep generated briefs separate from observed case outcomes. Keep process documents apart from cases: cases say what happened and documents say what is required, and an answer cites each under its own heading.

## Bound the analysis

Enforce execution constraints outside model control and preserve user-stated restrictions in context. Do not expose SQL, workspace selection, or write tools to the model.
Apply the run deadline to retrieval, reasoning, retries, and output repair together.
Enforce tool, step, candidate, and context limits from `docs/reference/system-contracts.md`.
Distinguish a successful empty search from a failed search. Do not replace missing services with runtime mocks.
Use actual tool events for progress. Do not invent a reasoning narrative.
Log request IDs, counts, timings, error codes, and usage. Keep case text and secrets out of logs.

## Apply pstack skills to the task

Use these installed skills when they match the work:

- `pstack:technical-writing` and `pstack:unslop` for repository documents and commit messages.
- `pstack:principle-boundary-discipline` for configuration, route, database, and tool adapters.
- `pstack:principle-type-system-discipline` and `pstack:typescript-best-practices` for domain contracts and TypeScript.
- `pstack:principle-sequence-verifiable-units` for the implementation order.
- `pstack:principle-prove-it-works` before reporting completion.

Read the relevant skill before applying it. Preserve the user's approved scope and execution method. Do not launch subagents unless the user or an applicable skill explicitly authorizes them.

## Verify the actual deliverable

Use the scripts defined in `package.json`.
Run focused tests while editing. Before closing a local release, run lint, typecheck, tests, the production build, and the required local database checks.
Open the running app and verify the case-to-answer flow. A passing build does not prove the flow works.
Report which checks ran and which checks remain blocked. Do not call planned checks passing.

## Keep the documents short

Keep the why in `docs/product`, the how in `docs/engine`, setup steps in `docs/how-to`, contracts in `docs/reference`, and decisions in `docs/architecture`.
`docs/product` and `docs/engine` are reader pages shown in the app. They do not link to repository files or name code symbols, and the docs tests fail if they do. Put a file pointer for an engine rule in `docs/architecture/overview.md`.
Update a document when its command or contract changes. In `docs/architecture`, `docs/reference`, and `docs/how-to`, use real paths, symbols, and scripts.
Do not add a second source for a limit or schema. Link to the owning document or code definition.
Keep secrets in ignored local environment files. Do not commit credentials, `.superpowers`, build output, or dependency directories.
