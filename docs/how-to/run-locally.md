# Run the local app

Use this guide after Tasks 1–6 in the [local plan](../superpowers/plans/2026-10-27-local-v0.md). This commit contains documents. The app and npm scripts do not exist yet.

## Start native Supabase

1. Use Node.js 24 and run `npm ci`.
2. Check `npx supabase --version` against the pinned version `2.122.0`.
3. Check that `supabase/config.toml` enables the experimental stack and omits fixed ports.
4. Start the project:

```sh
npx supabase start --runtime native --output-format json
```

5. Read the actual endpoints from the JSON output.
6. Write local app configuration to ignored `.env.local`. Map only the public URL and publishable key to public Next.js variables.
7. On a disposable local database, run `npx supabase db reset` to apply migrations and seed. This command deletes existing local data.
8. Run `npm run db:types`.
9. Run `npm run db:seed`.

Task 2 initializes the config with `SUPABASE_EXPERIMENTAL_STACK=1 npx supabase init`. Do not repeat initialization over an existing config.

## Configure and verify model access

1. Add the AI Gateway credential and model IDs to the server environment.
2. Match the embedding dimension to the vector migration.
3. Run `npm run doctor`.
4. Resolve unavailable services before a live analysis.

## Verify the app

1. Run `npm run dev`.
2. Open the localhost URL printed by Next.js.
3. Sign in with the seeded demo account.
4. Save a case and wait for the ready index state.
5. Submit a request from the local fixture.
6. Open a citation and check its section, revision, and excerpt.
7. Run `npm run test:db` and the local E2E test.

## Stop Supabase

Run `npx supabase stop` from this repo. The command preserves local data.

The [official native runtime guide](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes) lists platform requirements and experimental limitations.
