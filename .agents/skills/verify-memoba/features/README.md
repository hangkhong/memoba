# Memoba verification map

Read this index before driving the app. The map describes implemented user paths, including legacy redirects. It is maintained through source review and live verification.

## Preconditions and proof

Follow [Launch and Doctor](../SKILL.md). Drive one Next.js instance and one native project serially. The demo workspace is shared. Use unique synthetic titles and record created IDs. Basic seed creates accounts and concepts, not cases or briefs.

Recipes use Playwright's `page` and `expect`. Use exact accessible names. Capture the action, screenshot, ARIA snapshot, and an authorized second read for mutations. Keep credentials out of artifacts. Run Doctor after failures and restore a known UI state.

Creation proves one mapped feature. Maintenance covers every feature and accounts for every entry point. Report missing quota, data, or access with the route attempted. A skipped path does not become verified through another entry point.

## Features

- [Sign-in and workspace access](auth.md): landing, protected routes, refresh, sign-out, and outsider denial. Automated proof: `../proof/auth.spec.mjs`.
- [Text conversations](chat.md): text intake, suggested prompts, keyboard, follow-ups, history, retry, and mobile navigation.
- [Knowledge Hub](knowledge-hub.md): search, template and outcome filters, sorting, archived history, and detail navigation.
- [Case authoring and history](cases.md): both templates, reviewed import, sources, revisions, publication, archive, and typed link dialogs.
- [Analysis and saved answers](briefs.md): actual activity, saved text answers, citations, and legacy brief edits.

## Owning sources

Routes live in `src/app/`. Feature components live in `src/modules/conversations/`, `src/modules/cases/`, `src/modules/analysis/`, and `src/modules/briefs/`. Existing browser journeys live in `tests/e2e/`. Limits and data rules remain owned by `docs/reference/system-contracts.md` and its code links.
