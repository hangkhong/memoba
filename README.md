# The Memoba

Teams keep solving problems they have already solved. The past work exists, but finding it costs more than starting over, and what survives is usually the deliverable, not the reasoning.

Memoba makes asking cheaper than redoing. You ask in plain words, and an agent searches your team's recorded cases and process documents, reads what is relevant, and answers: what the process requires, how similar cases went, what is different this time, and a suggested next step. Each statement drawn from a source cites the section it came from. When nothing relevant is recorded, Memoba says so.

## Try it

Open [memoba.vercel.app](https://memoba.vercel.app) and sign in with the provided account. The workspace holds 20 cases and five process documents from Northwind Ledger, a fictional invoicing company. Three suggested prompts show the main behaviors:

1. **Launch to all customers.** Strong precedents that went in opposite directions.
2. **Price increase with notice.** A failed case under a changed condition.
3. **Singapore data center.** Nothing recorded, and the answer says so.

Open any citation to read the section behind it. A citation shows what the agent read. It does not prove that the advice fits your situation, so judge for yourself.

## Read why and how

Start with the [documentation map](docs/README.md).

- **Why:** [the problem](docs/product/why-teams-start-from-scratch.md), [what Memoba believes](docs/product/what-memoba-believes.md), and [what it leaves out](docs/product/what-memoba-leaves-out.md).
- **How:** [why search alone is not enough](docs/engine/why-search-alone-is-not-enough.md), [how it finds past work](docs/engine/how-memoba-finds-past-work.md), [how the agent answers](docs/engine/how-the-agent-answers.md), [how answers stay checkable](docs/engine/how-an-answer-stays-checkable.md), and [how knowledge gets in](docs/engine/how-knowledge-gets-in.md).

## What is real, and what is a preview

- **Real:** case capture and versions, process documents, search and citations, chat with follow-ups, saved answers that survive a refresh, and drafting a case from pasted notes.
- **Preview:** the Dashboard runs on labelled sample data, and files chosen in Import only show their names.
- **Not built:** connectors and the rest of the list in [What Memoba leaves out](docs/product/what-memoba-leaves-out.md).

One run reads a handful of sources well, so a question that needs many cases at once gets a partial view. The [evaluation record](docs/reference/evaluation.md) lists what was measured and what is still unproven.

## Run it

Use Node.js 24 and npm. [Run locally](docs/how-to/run-locally.md) starts the pinned native Supabase stack and prints the App, Studio, and API URLs. [Deploy the demo](docs/how-to/deploy-demo.md) covers Supabase Cloud and Vercel.

GitHub PRs run installation, lint, typecheck, unit tests, the build, native SQL checks, and browser checks without AI credentials.
