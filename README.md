# The Memoba

Teams repeat work they have already done, and the lessons sit in documents nobody reads. Memoba keeps past cases in one place and answers a new request with how similar cases went, what is different this time, and a suggested next step, with citations to the recorded cases.

Two things to try:

- **Capture.** Record a past case in Knowledge Hub with one of two fixed templates (Product/Delivery, CS/Operations), or use **Import from notes** to draft a case from pasted text. The draft is never saved until you review it and press Save.
- **Reuse.** Ask a new request in chat. The agent searches the recorded cases, reads the relevant ones, and answers. When nothing relevant is recorded, it says so instead of inventing precedent.

## Try the demo

Live demo: _link added after the first deployment_. Choose **Enter demo workspace** on the sign-in page. The workspace holds 20 cases from one invented SaaS company. Three suggested prompts on the new-chat screen show the main behaviors:

1. A launch with a strong precedent.
2. A price change that resembles a failed case under a changed condition.
3. A request with no recorded precedent.

Answers are model output grounded in the recorded cases. A valid citation shows which section was read, not that the advice fits your situation.

## What is real, what is a preview

- Real: case capture and revisions, search and citations, chat with follow-ups, saved answers that survive refresh, and drafting a case from pasted notes with one model call.
- Preview: choosing document files in Import only lists their names. Document parsing is coming soon; files stay in your browser.
- Deferred: connectors, document upload, multiple agents, per-visitor workspaces, and in-app rate limits. Hosted cost is bounded by a provider spending limit.

## Known limit and next step

An answer is built from the few most relevant cases one run can read, and it states how many matching cases it reviewed. Questions that need many cases at once ("everything we learned about pricing") get a partial view. The next step is batch reading with cited per-group notes and a cross-group synthesis, or precomputed case cards; it is deferred for this demo.

## Run it and read more

Use Node.js 24 and npm. [Run locally](docs/how-to/run-locally.md) starts the pinned native Supabase stack and prints the App, Studio and API URLs. [Deploy the demo](docs/how-to/deploy-demo.md) covers Supabase Cloud and Vercel.

- [Product design](docs/superpowers/specs/2026-10-29-text-agent-design.md)
- [How the agent engine steers the model](docs/architecture/agent-engine.md)
- [Architecture foundation](docs/architecture/FOUNDATION.md)
- [System contracts](docs/reference/system-contracts.md)
- [Evaluation status](docs/reference/evaluation.md)

GitHub PRs run installation, lint, typecheck, unit tests, build, native SQL checks, and browser checks without AI credentials.
