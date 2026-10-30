---
name: verify-memoba
description: Verify Memoba's local web UI with Playwright and native Supabase. Use after changes to sign-in, text chat, Knowledge Hub, case revisions, analysis, or saved answers, and when a build alone cannot prove behavior.
---

# Verify Memoba

Read [the feature index](features/README.md) before choosing a journey. Drive the Next.js UI. Use authenticated HTTP reads to confirm persisted state after user actions. The app has no product CLI.

## Launch

Run from the repository root with Node.js 24 and npm. Read [the local run guide](../../../docs/how-to/run-locally.md) and [system contracts](../../../docs/reference/system-contracts.md) for setup and behavior.

1. Run `npm ci` if dependencies are absent or the lockfile changed. Run `npx playwright install chromium` if Chromium is absent.
2. Keep `DEMO_EMAIL` and `DEMO_PASSWORD` in ignored `.env.local`. Use `.env.example` for the field list. Never print credentials. `db:seed` updates existing demo and outsider passwords to `DEMO_PASSWORD`; do not assume it preserves passwords.
3. Check port 3100 with `lsof -nP -iTCP:3100 -sTCP:LISTEN` and check `.next/dev/lock`. Refuse an occupied port or a live lock. Identify its owner. All dev instances in this checkout share `.next`.
4. Record whether the native stack already runs. Read the pinned `SUPABASE_STACK_ID` through `stackArgs()` in `scripts/local-stack.ts`. Plain CLI commands without the pin can select another branch's database. Save status JSON in a mode-600 scratch file. It contains credentials. If another person or agent is driving this database, stop.
5. For an existing configured stack, run Doctor and attempt UI login before changing setup. Apply migrations if needed. For initial setup, run the commands below. Pass `--stack-id` only when a pin exists. Capture JSON privately and use `db:configure` to read its endpoints.

```sh
umask 077
npx supabase start --runtime native --stack-id <SUPABASE_STACK_ID> --output-format json > /private/tmp/memoba-verify-start.json
npm run db:configure
```

After configuration, apply migrations against the pinned stack through the repository helpers:

```sh
node --experimental-strip-types --input-type=module <<'JS'
import { execFileSync } from 'node:child_process';
import { cli, cliDbUrl, readLocalStack } from './scripts/local-stack.ts';
execFileSync(cli, ['migration', 'up', '--db-url', cliDbUrl(readLocalStack())], { stdio: 'inherit' });
JS
npm run db:seed
npm run doctor
```

Basic seed writes accounts, membership, and concepts without model calls. Never use `db reset` against existing data. The helper does not start, migrate, seed, or stop Supabase.

Run the offline proof:

```sh
.agents/skills/verify-memoba/run.mjs
```

The executable starts one owned Turbopack server on port 3100 and drives journeys serially. It disables both OpenAI and Google keys in the server environment. It covers auth, text chat, both case templates, revisions, links, unavailable import, hub filters, sorting, and archive. It closes the server and browser after the last journey.

The real-provider proof uses the configured provider and incurs model calls:

```sh
MEMOBA_VERIFY_LIVE=1 .agents/skills/verify-memoba/run.mjs
```

It enables the configured keys and replaces the offline journey with real draft, publication, answer, citation, and cancellation checks. Inspect results rather than treating skipped profile-specific tests as coverage. Keep profiles sequential. Stop the first owned server before the next profile. Do not run `npm run dev` for this proof: that script terminates the port-3000 listener.

If Turbopack fails with an internal port permission error, obtain host permission. Stop only owned processes. Move only this run's generated `.next` output to scratch before a retry if the cached error persists. Do not switch to Webpack; Tailwind is configured through Turbopack.

## Doctor

Run `npm run doctor` before the first journey and after unexpected behavior. Require Node 24, CLI `2.122.0`, the experimental stack, valid app config, and usable native services. Idle services may report `sleeping`. A successful process exit alone does not prove usability.

Sign in through the UI and require this authenticated read:

```js
const response = await page.request.get('/api/workspace');
expect(response.status()).toBe(200);
expect(response.headers()['cache-control']).toContain('no-store');
expect((await response.json()).workspaceId).toBe('20000000-0000-4000-8000-000000000010');
```

The auth proof requires the **Sign in** heading, real member login, and this read. It also checks the styled Chat heading. After a failed drive, rerun Doctor before driving again. If the process is healthy but the UI is stuck, navigate to a known route or relaunch the owned server.

## Drive

Use installed `@playwright/test`, exact accessible names, and assertions instead of sleeps. The recipes in `features/` account for entry points the automated proofs do not cover. `proof/auth.spec.mjs` covers public, protected, and direct login, refresh, mobile logout, and outsider denial. `proof/maintenance.spec.mjs` contains offline and opt-in real-provider journeys.

The repository's `npm run test:e2e` also owns port 3100. It uses Turbopack locally and the production build in CI. Run it only after the helper stops. Existing journeys in `tests/e2e/` remain useful focused checks.

Real retrieval requires configured reasoning and embedding access, working quota, matching indexed profiles, and published evidence. Follow the local guide's `ai:probe` and explicit corpus seed when needed. OpenAI and Google are supported. Do not replace a missing provider with a runtime mock. A provider error cannot prove successful empty retrieval.

For legacy edit proof, use an existing authorized legacy structured brief. Current version-2 answers have no edit UI. Do not fabricate a legacy brief to claim a user journey. Record the attempted route and missing fixture if none exists.

## Evidence

Each helper run prints a fresh ignored directory under `.superpowers/verification/`. It survives teardown and contains:

- `auth/actions.json`, empty-form screenshots, authenticated screenshots, ARIA snapshots, and `auth/doctor.json`.
- Journey-specific actions, screenshots, and ARIA snapshots in `maintenance/` or `live/`.
- `results.json` with assertions and test results.
- `cleanup.json` with port and dev-lock checks, test exit status, and evidence survival. `databaseStopped: false` means the caller retains database ownership.

Capture user actions and results. Confirm mutations by reloading the view and reading the authorized endpoint. Never inject sessions, set database rows, intercept model responses, or use test-only endpoints to claim a UI journey.

Do not trace login, save storage state, snapshot filled credentials, or copy native status JSON into artifacts. Clear login fields before failure artifacts. Use synthetic notes and case content. Citation proof needs visible excerpts and authorized section/revision evidence. IDs alone do not prove semantic support.

Report each feature and entry point exercised. Keep skipped paths and unmet prerequisites separate. Live mode calls the real provider; UI mutations persist.

## Cleanup

Playwright closes its exact server and browser after the last test, including failures. The executable checks port 3100 afterward. It removes only a lock created by this run after `lsof` confirms no open owner. Never kill an existing server or use process-name matching.

Archive only synthetic cases created by this run through the UI. Record IDs immediately. On failure, run Doctor before cleanup and restore a known case route. Report retained records when cleanup cannot finish. For cases retained by a failed iteration, set `MEMOBA_VERIFY_ARCHIVE_IDS=id1,id2` on the next offline run. Use only IDs recorded in that iteration's evidence. The helper checks their synthetic title and archives them through the UI before new mutations.

Conversations and briefs have no delete UI; retain their labelled IDs. Do not reset shared data to hide residue.

Stop Supabase only if this run started it, using `npx supabase stop --stack-id <SUPABASE_STACK_ID>`. Preserve a previously running stack and all its data. Remove private status/start JSON files. Check that `auth/after-refresh.png`, `auth/actions.json`, and `results.json` still exist after final teardown. A failed evidence check fails the proof.

## Helpers

`run.mjs` is executable. Invoke it from the repository root. `playwright.config.mjs` and `proof/*.spec.mjs` are Playwright inputs. They are not standalone executables. `MEMOBA_VERIFY_LIVE=1` selects real-provider mode.

For map upkeep, run `/maintain-verification-skill`. Review source and drive every feature. Repair only this skill's docs and helpers. Report product failures separately.
