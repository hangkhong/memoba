# Run the local app

The framework, local Auth, workspace access, and structured request form run without an AI key. Case persistence, retrieval, and brief generation are not connected yet.

## Start the workspace

1. Use Node.js 24 and run `npm ci`.
2. Start the pinned native stack from this repository:

```sh
npx supabase start --runtime native --output-format json
```

The CLI prints credentials. Keep its output local. The config enables the experimental stack and assigns Supabase ports dynamically.

3. Apply pending migrations with `npx supabase migration up --local`.
4. Run `npm run db:configure`. This reads JSON status and writes only public Supabase values to ignored `.env.local`. It preserves other entries.
5. Set `DEMO_EMAIL` and a `DEMO_PASSWORD` of at least 12 characters in `.env.local`. See `.env.example` for names.
6. Run `npm run db:types` and `npm run db:seed`.
7. Run `npm run doctor`, then `npm run dev`.
8. Open the localhost URL printed by Next.js. Sign in with the credentials from `.env.local`.

`db:seed` only targets the running native stack on loopback. It creates one demo workspace, its member, and `outsider@memoba.local` for denied-access checks. Existing users and passwords are preserved. For a fresh seed, the nonmember uses `DEMO_PASSWORD`. It has no workspace membership. The six-case corpus is pending model verification.

If the native project changes, rerun `db:configure` and restart Next.js. No fixed Supabase port is assumed. Do not run another native Supabase project concurrently.

## Verify this checkpoint

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser suite checks login, refresh, logout, nonmember access, forged workspace selection, and structured intake. It does not claim to test the case-to-brief flow. Browser credentials come from `.env.local`. Traces are disabled.

The generated type file is `src/lib/supabase/database.types.ts`. Regenerate it after every migration. SQL tests use transactions and roll back their fixtures.

## Add model access

1. Set `GOOGLE_GENERATIVE_AI_API_KEY`, `AI_REASONING_MODEL`, `AI_EMBEDDING_MODEL`, and `AI_EMBEDDING_DIMENSIONS` in ignored `.env.local`. Use Google model IDs without a provider prefix.
2. Run `npm run ai:probe`.
3. Check the verified model and dimensions before implementing the vector migration from Task 3 of the [local plan](../superpowers/plans/2026-10-27-local-v0.md).

`ai:probe` uses the installed AI SDK to embed two synthetic Vietnamese and English inputs. It verifies count and dimension, then writes an ignored report under `.superpowers/probes`. Missing configuration exits with code 2. No runtime mock replaces a missing provider. The reasoning/tool capability check remains part of the live analysis integration.

## Stop the services

Stop Next.js with Ctrl+C. Run `npx supabase stop` from this repo to stop the native stack and preserve its data.

`npx supabase db reset --local` deletes local data. Use it only on a disposable database when testing migration replay, then rerun the seed.

The [Supabase native runtime guide](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes) describes platform support and experimental limitations.
