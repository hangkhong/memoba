# Run the local app

Use Node.js 24 and npm. Supabase CLI `2.122.0` is pinned in the project. The native runtime is experimental and runs one local project without Docker.

## Start the workspace

1. Run `npm ci`.
2. Start the native stack:

```sh
npx supabase start --runtime native --output-format json
```

Keep the JSON output local because it includes credentials. Open its Studio endpoint to inspect tables, Auth, and SQL. Ports are assigned dynamically.

3. Run `npx supabase migration up --local`.
4. Run `npm run db:configure`. This writes public Supabase values to ignored `.env.local` and preserves other entries.
5. Set `DEMO_EMAIL` and a `DEMO_PASSWORD` of at least 12 characters in `.env.local`.
6. Run `npm run db:types` and `npm run db:seed`.
7. Run `npm run doctor`, then `npm run dev`.
8. Open the URL printed by Next.js and sign in with the credentials from `.env.local`.

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
