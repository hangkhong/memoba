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

Save cases through **Record a case**. Without model access, the content remains saved with failed indexing and can be retried. A pending or failed edit preserves the previous published revision. Archive removes a case from new retrieval while preserving authorized history.

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

The browser suite uses its own Next.js server on port 3100 with model credentials disabled. It covers Auth, structured intake, unavailable analysis, case save, immutable revisions, indexing retry, and archive. Unit tests use the official AI SDK test providers. No runtime mock supplies evidence or model output.

The CI workflow runs the same foundation checks against a fresh native database. Production build checks can run without AI or Supabase environment values. Regenerate `src/lib/supabase/database.types.ts` after migrations. If a case or request schema changes, create a new migration with `npx supabase migration new input_contracts`, then generate its checks with `npm run db:contracts -- <new-migration.sql>` before applying it.

## Verify model integration when quota is available

1. Set `GOOGLE_GENERATIVE_AI_API_KEY`, `AI_REASONING_MODEL`, `AI_EMBEDDING_MODEL`, and `AI_EMBEDDING_DIMENSIONS` in ignored `.env.local`. Model IDs use no provider prefix.
2. Run `npm run ai:probe`. The current vector migration requires `gemini-embedding-2` and 1536 dimensions. A model or dimension change requires a migration and reindexing.
3. Run `npm run db:seed -- --cases` to index six labelled synthetic cases. Use `--challenge` instead for the authored 24-case corpus. Both commands call the real embedding model and preserve ready seed revisions.
4. Run `RUN_LIVE_MODEL_TESTS=1 npm run test:e2e -- --grep @live` to opt into case indexing and full analysis checks.

The probe embeds two synthetic Vietnamese and English inputs and writes an ignored report under `.superpowers/probes`. Missing configuration exits with code 2. Missing token usage is stored as unknown.

The live checks need working provider quota. They have not established a successful live brief. Use [Evaluation status](../reference/evaluation.md) for the remaining acceptance work.

## Stop the services

Stop Next.js with Ctrl+C. Run `npx supabase stop` to stop the native stack and preserve its data.

`npx supabase db reset --local` deletes local data. Use it only for a disposable database when testing migration replay, then rerun the seed.
