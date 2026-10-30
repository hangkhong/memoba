# Analysis and saved answers

A member watches actual activity, reads a saved text answer, and inspects pinned source evidence. Legacy structured briefs remain readable and editable separately.

## Sub-features

- `analysis-run` shows actual events, streaming output, and terminal state.
- `analysis-gap` distinguishes successful empty retrieval from provider failure.
- `answer-read` reopens saved output in chat, run, and standalone views.
- `answer-citations` discloses authorized section and revision evidence in a responsive panel.
- `brief-legacy-edit` saves user text separately for legacy briefs only.

## How to get to it

Send a natural-language Chat question or reopen its sidebar title. `/workspace/analyses/:id` exposes **Open answer** for version 2 or **Open Reuse Brief** for legacy output. `/workspace/briefs/:id` renders **Answer** or **Reuse Brief** accordingly. Numbered citation buttons and the expandable source list open evidence.

## Drive

Require UI login, Doctor, working configured reasoning and embedding access, quota, and ready cases with the matching profile. Follow the local guide's probe and explicit corpus seed if needed. Basic seed is insufficient. OpenAI and Google are supported.

1. At 1440px width, submit a message containing context and restrictions. Wait for the real analysis POST, record `x-run-id`, and inspect actual activity and streaming text.
2. Wait for the saved `.answer-markdown`. Read `/api/analyses/:id`, require `complete` and `briefId`, then read `/api/briefs/:id`. A completed state alone does not prove evidence quality.
3. When the answer uses cases, inspect **How similar cases went**, **What's different this time**, and **Suggested next step**. Compare historical claims with authorized excerpts. These are model instructions, so a missing section is an evaluation finding rather than a reason to rewrite expectations silently.
4. Click `getByRole('button', { name: /^Open source/ }).first()`. Require complementary **Source evidence**, its blockquote, outcome, and recorded date. Expand **Details** to inspect revision, section, and author. Match the excerpt and revision against the brief API. **Open current case** can show a newer revision, so do not confuse latest content with the cited source.
5. Close with **Close source**. At mobile width, repeat opening and require the **Source evidence** dialog. Inspect hover preview and expandable source list separately.
6. Open the saved run, choose **Open answer**, and require standalone **Answer** and the same saved text. Reload while counting analysis POSTs; require none. Reopen the conversation and require the same result.
7. For a reviewed no-precedent request, require a successful search event and saved coverage without search failure. Inspect the answer's no-match wording. Current text analysis saves a `complete` answer, including general guidance. `gap_report` and **No precedent found** remain historical branches, not required new-run output.

For legacy edit proof, use a genuine authorized legacy `/workspace/briefs/:id`. Fill **Your edited version**, choose **Save edited brief**, reload, and compare generated versus edited text through the API. Version-2 answers have no edit controls. If no legacy fixture exists, record the attempted entry and missing prerequisite.

## Gotchas

The offline profile cannot prove model behavior. Missing quota, matching publication, or a legacy fixture is an unmet prerequisite. Citation identity does not prove semantic support. Generated proposals are not observed outcomes.

Coverage is stored in `generated.coverage`. Check the current UI against the owning contract's expected coverage line. If the line is absent, report a product gap separately; do not remove the requirement to make the proof pass.

Saved-answer loading, retry after a read failure, long streaming output, and active navigation need separate drives. There is no brief-delete UI. Report retained synthetic run, conversation, and brief IDs.
