# Run the local app

Use Node.js 24 and npm. Supabase CLI `2.122.0` is pinned in the project. The native runtime is experimental and runs one local project without Docker.

## Start the workspace

For the first setup, run `npm ci` and set `DEMO_EMAIL` and `DEMO_PASSWORD` in `.env.local`. The password must have at least 12 characters. Copy `.env.example` if the file does not exist.

Start the app:

```sh
npm run dev
```

Open http://localhost:3000. Visitors see the landing page, whose **Open the demo** button goes to `/login`, and a signed-in user is sent straight to Chat. Sign in with the `DEMO_EMAIL` and `DEMO_PASSWORD` from `.env.local`. The command starts the native stack, applies migrations, updates local connection settings, seeds the workspace, and prints the App, Studio and API URLs. It never seeds cases; when the Knowledge Hub is empty it says so. It stops whatever process is listening on port 3000 (SIGTERM, then SIGKILL if it does not exit) so the app always starts there.

The native stack assigns its own ports, so use the printed URLs. The printout never includes keys.

## Keep one local database across branches

The native backend derives a separate stack from each git branch, so a new branch would otherwise open an empty database. The first `npm run dev` writes the stack it started to `SUPABASE_STACK_ID` in `.env.local`. After that, `dev`, `db:configure`, `db:types`, `test:db`, `doctor` and the seed scripts open that stack on every branch, and migrations run against it with `--db-url`. Delete the line to start a new stack on the next `npm run dev`.

Run plain `npx supabase` commands with `--stack-id` or `--db-url`. Without them the CLI opens the current branch's stack instead of the shared one.

`db:seed` creates the local workspace, its member, a nonmember test account, and fixed concepts. It preserves existing users and passwords. It does not call a model by default.

To load the demo company's 20 cases and five process documents, run `npm run db:seed -- --demo`. It calls the embedding provider only for cases and documents that are not already indexed, and fails when no embedding model is configured. To remove visitor cases, documents, and conversations and restore the seed corpus, run `npm run demo:reset`; it publishes the demo documents again.

After sign-in, Chat opens by default. Enter a question and add context in **Request details**. Conversations persist even without model access. Follow-up turns retain the confirmed request state, and reload does not restart analysis.

Press Enter to send a question or Shift+Enter to add a line. During an active analysis, choose **Stop analysis** in the composer. Scroll upward to read earlier turns, then choose **Scroll to latest message** to follow new content again. Expand **Activity** to inspect actual stage and tool events.

Open **Knowledge Hub** in the sidebar and select **Record a case** to open a dialog and enter a case through either fixed template, or choose **Import from notes** to draft one from pasted text in its own dialog. Review every field before saving; document files in Import are a preview and are not read. **Edit case** and **Archive** on a case page also open dialogs. Without model access, the content remains saved with failed indexing and can be retried. A pending or failed edit preserves the previous published revision. Archive removes a case from new retrieval while preserving authorized history.

Open the **Documents** tab of the Knowledge Hub and select **Add document** to publish a policy, procedure, or guideline: name it, say when to use it, paste Markdown or choose a `.md` or `.txt` file, and set its type, area, owner, and effective date. The preview shows the blocks the agent will read. A document is embedded and published in one step, so with no embedding model the save fails and nothing is stored. **Edit document** publishes a new version.

If the native project changes, rerun `db:configure` and restart Next.js. Do not run another native Supabase project concurrently. `npx supabase stack list` shows every stack and its branch.

## Verify without model calls

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser suite uses its own Next.js server on port 3100 with model credentials disabled. It covers the landing page, Auth, structured chat, saved follow-ups, unavailable analysis, reload, mobile navigation, case save, immutable revisions, indexing retry, and archive. Unit tests use the official AI SDK test providers. No runtime mock supplies evidence or model output.

The CI workflow runs the same foundation checks against a fresh native database. Production build checks can run without AI or Supabase environment values. Regenerate `src/lib/supabase/database.types.ts` after migrations. If a case or request schema changes, create a new migration with `npx supabase migration new input_contracts`, then generate its checks with `npm run db:contracts -- <new-migration.sql>` before applying it.

## Verify model integration when quota is available

1. Add `OPENAI_API_KEY` to ignored `.env.local`. Set `AI_REASONING_MODEL=openai:gpt-6-luna`, `AI_EMBEDDING_MODEL=openai:text-embedding-3-small`, and `AI_EMBEDDING_DIMENSIONS=1536`. OpenAI-only configuration does not require a Google key. Model references use `provider:model`. Legacy unprefixed IDs select Google.
2. Run `npm run ai:probe` once to check the embedding dimension and provider access.
3. If existing cases use another profile, stop Next.js and run `npx supabase migration up --local`, `npm run db:types`, and `npm run ai:migrate-embeddings` before starting the app. This indexes same-content replacement revisions and verifies every active case has a ready published revision under the selected profile. It preserves old revisions and citations. A second run reuses ready revisions without another embedding call. Resolve any reported pending-edit or stale-source conflict before normal use. An active case with no published revision uses its latest saved content as the migration source.
4. If a synthetic corpus is needed, run `npm run db:seed -- --cases`. Use `--challenge` only for the authored 24-case evaluation corpus. Both flags call the real embedding provider. Seed keeps existing case IDs, reuses matching ready revisions, and preserves archived history.
5. Start the app and send one structured request. Inspect the brief, citations, and saved result after refresh. For the automated opt-in journey, run `RUN_LIVE_MODEL_TESTS=1 npm run test:e2e -- tests/e2e/local-flow.spec.ts` after stopping other Next.js servers. Run `npm run ai:probe -- --tool` only when the analysis did not exercise tool calling and a capability check is needed.

To keep Google available, use `google:<model-id>` and `GOOGLE_GENERATIVE_AI_API_KEY`. The supported Google embedding profile remains `google:gemini-embedding-2` at 1536 dimensions. Changing the embedding provider requires the migration above. Do not change only the env model and search old vectors with the new model.

The probe embeds two synthetic Vietnamese and English inputs and writes an ignored report under `.superpowers/probes`. Missing configuration exits with code 2. Missing token usage is stored as unknown.

The live checks need working provider quota and model access for the configured account. A runtime smoke check does not establish semantic quality. Use [Evaluation status](../reference/evaluation.md) for the remaining acceptance work.

## Stop the services

Stop Next.js with Ctrl+C. Run `npx supabase stop --stack-id <SUPABASE_STACK_ID>` to stop the shared stack and preserve its data.

`npx supabase db reset --local` deletes local data. Use it only for a disposable database when testing migration replay, then rerun the seed.
