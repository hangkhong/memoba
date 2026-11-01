# How knowledge gets in

The engine can only be as good as what it reads. [The same questions run on two corpora](../reference/evaluation.md#suggested-prompts-on-two-corpora) show this plainly: richer cases gave better answers with no change to the agent. So capture has two jobs that pull against each other. It has to record enough reasoning to be reusable, and it has to stay cheap enough that somebody does it.

## A case records reasoning

A case uses one of two fixed templates, Product/Delivery or CS/Operations. Both require a title, problem, context, approach, and outcome state. Constraints and lessons are optional, and each template adds a few optional fields of its own, such as deployment conditions or customer impact.

The required fields are the ones a later reader can't reconstruct. Why it was needed, what was true at the time, what was tried. The form insists on one more thing: a known outcome must be described. "Achieved" with no detail teaches nothing, and "unknown" is an honest alternative.

[`caseInputSchema`](../../src/modules/cases/schema.ts) owns these rules. The templates shape what a person records and do not limit retrieval, so a CS question can find a delivery case.

## A case is not searchable until it is ready

Saving a case creates an immutable revision. Memoba embeds each nonempty section, and the revision is published only when all its sections are indexed. If indexing fails, the content stays saved, the case shows that state, and you can retry.

An edit follows the same path, which has a useful consequence. While a new revision is pending or has failed, retrieval keeps using the published one. A half-finished edit never reaches an answer.

## Import drafts, it never saves

Writing a case from a blank form is the most expensive step in the loop, so Import starts from pasted notes. One model call fills the form, with no tools and no saving. Fields the notes don't state stay empty, and the outcome stays unknown unless a result is described.

A person then reviews the draft and saves it through the normal form. That step is the rule that keeps invented experience out of the team's memory. Import reduces the typing. It does not reduce the responsibility.

<!-- diagram: memory-door -->

Choosing a file in Import is only a preview: the name is listed and the content is not read.

## A process document says what is required now

A document has a name, a description of when to use it, Markdown content, a type, an area, an owner, and an effective date. You paste the text or choose a `.md` or `.txt` file, which is read in your browser.

The type tells the agent how binding the text is. A policy is required, a procedure is a required sequence of steps, and a guideline is advisory.

Every edit publishes a new version, and it needs a note saying what changed and why. Teams change process often, and they need to keep it current while still seeing what an old answer relied on. Older versions stay readable.

## Documents split along their own structure

Long documents can't be read all at once, and cutting by character count would slice a requirement in half. [`splitDocument`](../../src/modules/documents/split.ts) splits along the headings instead. A block is the content under the shallowest heading level that repeats. Inside a block, whole paragraphs, tables, and list items are packed into sections. The form previews the blocks before you publish, using the same function the server runs.

The agent reads whole blocks, and each document also gets a searchable summary built from its title, description, and details. The summary is never read or cited, because it says what the document is about. It does not say what the document requires.

## Publishing is one step

A document has no pending state. `publish_document` embeds first, then stores the version, its sections, and the published pointer in one transaction. A document is either searchable or absent, and without an embedding model the save fails with nothing stored.

Cases and documents take different paths here because their edits differ. A case is a record that someone may save with a retry later. A document is a rule, and a half-published rule is worse than none.

<!-- diagram: edit-goes-live -->

## Archiving keeps history

Archiving removes a case or document from new retrieval. Citations in saved answers stay, subject to access, so the reasoning behind an old decision doesn't disappear when its source retires.

The exact rules are in [system contracts](../reference/system-contracts.md).
