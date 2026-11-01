# How the agent answers a question

Memoba's answers are useful because of what surrounds the model call. The application steers the model's work, and this page follows one run to show how.

## The model decides, the application holds the rules

One agent chooses what to do next: search, read a case, read a document, ask a clarifying question, or answer. That choice is the only thing the model controls.

| The model decides | The application guarantees |
|---|---|
| What to search for | Search covers only active, published sources in your workspace |
| Which cases, documents, and sections to read | Each read is pinned to one version and counted against a budget |
| When it has enough evidence | Investigation stops at the deadline or at a tool, step, or input limit |
| How to word the answer | Every citation resolves to text it actually read, and your access is rechecked |
| What it judges relevant | The state of each source comes from real tool results, not from the model's claim |

The model has no SQL, no workspace selector, and no write tool, so it cannot widen its own access or budget. Anything a person has to trust stays in code. In the demo workspace, asked how many matching cases it had reviewed, the model wrote "2 of 2" after search had shown it 12 to 18, so the application does its own counting.

## One run, step by step

A run goes from question to saved answer in seven steps. The model chooses what to search for and read, and writes the answer. The application handles every other step.

<!-- diagram: agent-run -->

**Admission.** The server derives you and your workspace from the session, checks membership, enforces the concurrent run limit, and writes a deadline to the database. Model calls, embeddings, tools, and correction all share that one deadline, so a retry can't buy fresh time.

**Search.** The search tool returns case previews and document cards, each source with its own state. [How Memoba finds past work](how-memoba-finds-past-work.md) covers this.

**Read.** Reading cases opens up to three per call. Each starts with a header holding the title, template, outcome state, and observed outcome. Sections follow in priority order: approach, outcome, problem, context, constraints, lessons. When the budget runs out, the least useful sections drop first, so a case never loses its outcome while keeping its background.

Reading a document opens one document. A block arrives whole or is listed as omitted, so a requirement is never cut in half. Documents have their own budget, so a long policy can't push out case evidence.

**Stop.** Before each step, the application checks the deadline, the tool count, the step count, and how large the model's input has become. It keeps time in reserve for writing. Near any limit it removes the tools, so the next step has to answer from what was read. The agent always gets the chance to finish.

**Write.** The model words the answer from what it read, with a citation marker beside each claim it supports.

**Validate.** The application checks every citation in the draft. One correction attempt is allowed, within the same deadline. [How an answer stays checkable](how-an-answer-stays-checkable.md) covers this.

**Save.** The answer, the cited source snapshots, usage, and the coverage record are saved together. A refresh reads the saved result and never restarts the model. Sending a message starts a run, and opening a conversation never does.

## What the instructions ask for

The agent's instructions tell the model how a careful colleague would work:

- Ask a clarifying question only when the answer would change the advice.
- Search again with different wording, and look for failures and counterexamples.
- Treat a search result as a candidate, and read what clearly applies before answering.
- Prefer cases with known outcomes, and near-duplicates whose conditions differ.
- Keep requirements and recorded outcomes apart, and report both when they differ.
- Say when the process is silent, report conflicting documents without choosing, and give a document's exception route instead of softening the requirement.

The static instructions come first and the request comes last, in its own block, so the provider can cache the static part.

These instructions shape behavior, and they can fail. An answer once filled "Where practice and process differ" with a weak difference, and another read a document that did not apply. Anything that must not depend on the model following instructions is a control in code.

## Each control exists to stop a specific failure

| Control | Without it |
|---|---|
| Citations only from read sections, checked after writing | The model cites previews or invents sources |
| Access recheck on every cited source | A saved answer leaks text you can no longer see |
| Immutable versions, pinned per run | A citation points to text that changed after the answer |
| One shared deadline | Retries and correction get fresh time, and runs never end |
| Tools removed near a limit, time reserved for writing | The agent keeps investigating and never answers |
| Input ceiling from reported usage | The conversation grows past what the budget estimates |
| Outcome read first | Budget cuts drop the outcome and keep the background |
| Two sections per case in search | One long case fills every slot |
| Source state from tool events | The answer claims it checked everything, or reads a failed search as "no policy" |
| Separate budgets and headings for cases and documents | Process text crowds out outcomes, or a case is cited as the rule |
| Generated advice kept apart from outcomes | Proposed steps are later read as things the team did |
| Drafts never saved without a person | AI-written text becomes recorded experience |

## What one run can't do

One run reads a handful of sources well. It does not compare every case in a large workspace. In the demo workspace, the agent's practical ceiling was its own behavior: it stopped reading before the budget did. The next section covers what comes after.

## The next engine step

One run reads a handful of cases in full. That suits the demo corpus and not a question that has to compare many cases. Two options are planned for when real questions need them:

- **Batch reading.** Read groups of cases into short cited notes, then write one answer across the groups.
- **Case cards.** Precompute a short summary per case, so that search covers more cases in less context.

Both add model calls and cost. They wait until usage shows that the partial view is the real limit. Each run already records how many sources it found and how many it read, which is the signal to watch.
