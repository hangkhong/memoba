# The Memory Bank

A knowledge workspace for a seven-day PM challenge. It captures structured experience and prepares evidence for a Reuse Brief.

The current checkpoint runs Next.js, Supabase native Auth, and a verified demo workspace. It includes shadcn UI, structured request intake, and tested domain contracts. It does not yet save cases or generate briefs.

## Run locally

Use Node.js 24 and npm. Follow [Run the local app](docs/how-to/run-locally.md) to start native Supabase, configure endpoints, seed demo membership, and sign in.

No AI key is needed for this checkpoint. Missing model access is reported explicitly.

## Continue implementation

- [Product scope](docs/superpowers/specs/2026-10-27-memory-bank-design.md)
- [Architecture](docs/architecture/FOUNDATION.md)
- [System contracts](docs/reference/system-contracts.md)
- [Implementation plan and progress](docs/superpowers/plans/2026-10-27-local-v0.md)

The next dependency is a successful embedding capability probe. It fixes the model and dimension before the knowledge migration. Then implement revision persistence, hybrid retrieval, bounded analysis, saved briefs, and live evaluation.
