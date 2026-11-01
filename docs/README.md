# Memoba documentation

These documents answer two questions: why Memoba is built the way it is, and how it works. Read them in order the first time. Each page stands alone after that.

## Why

1. [Why teams start from scratch](product/why-teams-start-from-scratch.md) names the problem under the problem.
2. [What Memoba believes](product/what-memoba-believes.md) explains the ideas every part of the product comes from.
3. [What Memoba leaves out](product/what-memoba-leaves-out.md) lists what this version refuses, and why.

## How

The engine is the product, so most of the explanation lives here.

1. [Why search alone is not enough](engine/why-search-alone-is-not-enough.md) compares Memoba with the usual way of putting a model on top of files.
2. [How Memoba finds past work](engine/how-memoba-finds-past-work.md) explains keyword search, search by meaning, and why it uses both.
3. [How the agent answers a question](engine/how-the-agent-answers.md) follows one run from question to saved answer.
4. [How an answer stays checkable](engine/how-an-answer-stays-checkable.md) explains citations, and what they do not prove.
5. [How knowledge gets in](engine/how-knowledge-gets-in.md) explains cases, process documents, and versions.

## Look something up

- [Architecture overview](architecture/overview.md): the modules, the decisions behind them, and the next step.
- [System contracts](reference/system-contracts.md): data, tool, state, and API rules.
- [Evaluation record](reference/evaluation.md): what was measured, with run results.
- [UI presentation](reference/ui-presentation.md): how each screen is put together.
- [`limits.ts`](../src/lib/contracts/limits.ts): every runtime limit. No other document repeats these values as rules.
- [Run locally](how-to/run-locally.md) and [Deploy the demo](how-to/deploy-demo.md).

The code is the source of truth. If a page and the code disagree, the page is wrong.
