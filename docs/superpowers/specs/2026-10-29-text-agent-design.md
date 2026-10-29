# Text-first knowledge agent

Memoba is a seven-day demo for one PM and one workspace. A member asks a natural-language question and receives advice that can draw on recorded team cases. The agent may ask for clarification or answer directly when investigation is unnecessary.

## Product scope

Chat accepts a question without a separate request form. Follow-ups retain bounded conversation history, including the user's restrictions. Earlier assistant text is context, not evidence. A user can stop a run, retry an unsuccessful attempt, and reload saved questions and answers. Refresh does not resume generation.

Knowledge Hub retains two fixed manual case templates: Product/Delivery and CS/Operations. A case records its problem, context, approach, and outcome state. Optional sections add conditions, lessons, and source metadata. A known outcome requires details. Revisions are immutable and become available for retrieval only after indexing succeeds.

## Agent behavior

One agent decides whether to search cases, read a case, investigate further, ask a question, or answer. Search previews help select a case; a citation can refer only to a section the agent read. Answers use free text and place source links beside the relevant statements. Saved citations retain their case, revision, section, and authorized excerpt, including when a case is later archived.

The agent distinguishes recorded outcomes from proposed advice and unknown results. General advice is not evidence of team experience. Citation checks establish source identity, not semantic support. Evaluation and human review remain necessary to assess whether a source supports a claim and whether advice fits the decision.

Runs use a shared deadline and bounded model, tool, and context budgets. User cancellation stops work where supported; completed answers and terminal states are saved. The hosted profile leaves time for setup and cleanup within its invocation ceiling. [System contracts](../../reference/system-contracts.md) own limits and lifecycle details.

## Outside this demo

Connectors, uploads and parsing, automatic case authoring, external research, multiple reasoning agents, generative UI, and durable background resume are deferred. Authentication and workspace membership remain the access boundary. Generated advice does not become an observed case outcome.

The [architecture foundation](../../architecture/FOUNDATION.md) describes module ownership and persistence. [Evaluation status](../../reference/evaluation.md) records observed behavior and open quality checks.
