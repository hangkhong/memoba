# Run the local app

Use Node.js 24 and npm. Supabase CLI `2.122.0` is pinned in the project. The native runtime is experimental and runs one local project without Docker.

## Start the workspace

For the first setup, run `npm ci` and set `DEMO_EMAIL` and `DEMO_PASSWORD` in `.env.local`. The password must have at least 12 characters. Copy `.env.example` if the file does not exist.

Start the app:

```sh
npm run dev
```

Open http://localhost:3000 and sign in with the demo credentials. The command starts the native stack, applies migrations, updates local connection settings, and seeds the workspace. It replaces an existing Memoba server on port 3000. If another application owns the port, stop that application first.

The native stack assigns its own ports. To inspect its Studio endpoint, run `npx supabase status --output-format json`. Keep the output local because it includes credentials.

`db:seed` creates the local workspace, its member, a nonmember test account, and fixed concepts. It preserves existing users and passwords. It does not call a model by default.

After sign-in, Chat opens by default. Enter a question and add context in **Request details**. Conversations persist even without model access. Follow-up turns retain the confirmed request state, and reload does not restart analysis.

Press Enter to send a question or Shift+Enter to add a line. During an active analysis, choose **Stop analysis** in the composer. Scroll upward to read earlier turns, then choose **Scroll to latest message** to follow new content again. Expand **Activity** to inspect actual stage and tool events.

Open **Knowledge Hub** in the sidebar and select **Record a case** to enter or paste a case through either fixed template. Without model access, the content remains saved with failed indexing and can be retried. A pending or failed edit preserves the previous published revision. Archive removes a case from new retrieval while preserving authorized history.

If the native project changes, rerun `db:configure` and restart Next.js. Do not run another native Supabase project concurrently.

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

The browser suite uses its own Next.js server on port 3100 with model credentials disabled. It covers Auth, structured chat, saved follow-ups, unavailable analysis, reload, mobile navigation, case save, immutable revisions, indexing retry, and archive. Unit tests use the official AI SDK test providers. No runtime mock supplies evidence or model output.

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

Stop Next.js with Ctrl+C. Run `npx supabase stop` to stop the native stack and preserve its data.

`npx supabase db reset --local` deletes local data. Use it only for a disposable database when testing migration replay, then rerun the seed.
