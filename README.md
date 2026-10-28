# The Memory Bank

A local chat workspace for one PM. Ask questions in saved conversations and build the agent's evidence through Product/Delivery and CS/Operations cases in Knowledge Hub.

The foundation includes a responsive sidebar, structured chat composer, ordered conversation turns, case revisions and publication, shared retrieval, bounded analysis, and saved briefs. Missing model access preserves questions and cases without creating a fake response. Follow-ups carry user-confirmed request context and constraints. Interpreting references to prior assistant proposals is deferred to a feature branch.

The Gemini embedding probe and a case save/index/publish flow passed before the provider became rate-limited. A complete live-model brief has not passed verification. Semantic quality and challenge acceptance remain pending. See [evaluation status](docs/reference/evaluation.md).

Use Node.js 24 and npm. Follow [Run locally](docs/how-to/run-locally.md) for the pinned native Supabase stack and the default checks, which do not call a model.

- [Architecture foundation](docs/architecture/FOUNDATION.md)
- [System contracts](docs/reference/system-contracts.md)
- [Implementation plan](docs/superpowers/plans/2026-10-27-local-v0.md)
- [Chat and Knowledge Hub foundation](docs/superpowers/plans/2026-10-28-chat-knowledge-hub.md)

GitHub PRs run installation, lint, typecheck, unit tests, build, native SQL checks, and browser checks without AI credentials. Live model tests require an explicit opt-in.
