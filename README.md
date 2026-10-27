# The Memory Bank

Memory Bank helps Product/Delivery and CS/Operations teams reuse past work. A structured request produces a Reuse Brief with evidence, applicability limits, and missing information.

This repo contains the approved design, agent instructions, architecture documents, and a local implementation plan. The application has not been bootstrapped.

## Repository documents

- [Agent instructions](AGENTS.md)
- [Local v0 plan](docs/superpowers/plans/2026-10-27-local-v0.md)
- [Run the local app](docs/how-to/run-locally.md)
- [System contracts](docs/reference/system-contracts.md)
- [Architecture foundation](docs/architecture/FOUNDATION.md)
- [Product design](docs/superpowers/specs/2026-10-27-memory-bank-design.md)

## Local release

The stack uses Next.js, TypeScript, shadcn/ui, React Hook Form, Zod, AI SDK 7, and Supabase. Tests use Vitest, pgTAP, and Playwright.

Local Supabase uses pinned CLI `2.122.0` and native runtime. Docker is not required. The experimental stack needs the smoke checks in the plan. The first checkpoint uses six demo cases and two real-model requests.
