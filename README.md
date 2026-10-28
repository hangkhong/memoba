# The Memory Bank

A local knowledge workspace for one PM. Record Product/Delivery and CS/Operations cases, preserve their revisions, and prepare structured requests for an evidence-backed Reuse Brief.

The application includes Supabase Auth and membership, case revision storage and publication, hybrid retrieval, bounded analysis orchestration, saved briefs, and separate user edits. Missing model access leaves saved cases available for indexing retry and prevents analysis admission.

The Gemini embedding probe and a case save/index/publish flow passed before the provider became rate-limited. A complete live-model brief has not passed verification. Semantic quality and challenge acceptance remain pending. See [evaluation status](docs/reference/evaluation.md).

Use Node.js 24 and npm. Follow [Run locally](docs/how-to/run-locally.md) for the pinned native Supabase stack and the default checks, which do not call a model.

- [Architecture foundation](docs/architecture/FOUNDATION.md)
- [System contracts](docs/reference/system-contracts.md)
- [Implementation plan](docs/superpowers/plans/2026-10-27-local-v0.md)

GitHub PRs run installation, lint, typecheck, unit tests, build, native SQL checks, and browser checks without AI credentials. Live model tests require an explicit opt-in.
