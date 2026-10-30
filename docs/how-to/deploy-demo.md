# Deploy the hosted demo

Steps 1 to 3 and the deploy were run on 2026-10-30 against Supabase project `memoba` and Vercel project `nguyen-khang/memoba`. Record the step 4 results in [evaluation status](../reference/evaluation.md).

You need a Supabase Cloud project, a Vercel Hobby project connected to this repository, and a dedicated OpenAI project with a hard spending limit. The spending limit and `concurrentRuns` in [`limits.ts`](../../src/lib/contracts/limits.ts) bound cost; the app has no rate limit.

## 1. Prepare variables

Copy [`.env.example`](../../.env.example) to `.env.local`. Add `SUPABASE_URL` (`https://<project-ref>.supabase.co`) and `SUPABASE_SECRET_KEY` (Project Settings → API Keys → Secret keys). Only the scripts read them. Keep the same `AI_*` values you will set in Vercel, because the seed embeds with them.

## 2. Prepare Supabase Cloud

Log in, then push the migrations by connection string. Copy the Session pooler string from the dashboard's Connect panel, and percent-encode any special characters in the password:

```bash
npx supabase login
```

```bash
npx supabase db push --db-url "<session-pooler-connection-string>"
```

Do not use `supabase link`. It pins the Cloud Postgres and Storage versions into the committed [`supabase/supabase.lock`](../../supabase/supabase.lock), and the next local `npm run dev` refuses to start the native stack. If you linked by mistake, run `npx supabase unlink` and `git checkout supabase/supabase.lock`.

Check that every local version appears remotely:

```bash
npx supabase migration list --db-url "<session-pooler-connection-string>"
```

In Integrations → GitHub, connect the repository with working directory `.`, turn on "Deploy to production", and set the production branch to `main`. After the first push, merging to `main` applies new migrations, so later releases need no `db push`. Vercel deploys at the same time, so new code can run briefly before its migration finishes. To confirm a merge reached the database, run `npx supabase migration list --project-ref <project-ref>`, which needs only the `supabase login` session.

In Authentication → Sign In / Providers, turn off "Allow new users to sign up". Then seed the corpus and the demo account:

```bash
npm run db:seed -- --demo --remote
```

Expected: the seed reports the case count with index state ready (20 for the demo corpus). Seeding is incremental; rerunning embeds only missing cases. The seed sets the demo user's password to `DEMO_PASSWORD` every run, so `npm run demo:reset -- --remote` also recovers the account if a reviewer changes it.

## 3. Configure Vercel

Create the project from the GitHub repository on the Hobby plan with Fluid Compute and Node.js 24. Connecting it through the Supabase Vercel integration sets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The integration also syncs server keys and `POSTGRES_*` variables that the app never reads; leave them, because it re-syncs them.

[`vercel.json`](../../vercel.json) pins functions to `hnd1` (Tokyo), next to the Supabase project in `ap-northeast-1`. Keep the two regions equal. A page makes 5 to 20 database round trips, so a function in another region pays the cross-ocean latency on each one; with functions in `iad1`, a conversation render took about 3.4 seconds. If you create the Supabase project in another region, change `regions` to the nearest Vercel region.

Set `OPENAI_API_KEY` in the dashboard. Add the model variables with the CLI after `vercel link`:

```bash
printf 'openai:gpt-6-luna' | vercel env add AI_REASONING_MODEL production
```

Repeat for `AI_EMBEDDING_MODEL` and `AI_EMBEDDING_DIMENSIONS`. Do not set `DEMO_EMAIL` or `DEMO_PASSWORD` in Vercel; only the scripts read them. Reviewers sign in with the provided account on the normal form.

## 4. Deploy and verify

Deploy from a clean export of `main`, so local `.env*` files are never uploaded. `vercel link` writes a `.env.local` with an OIDC token into the export; delete it before deploying.

```bash
mkdir ../memoba-deploy && git archive main | tar -x -C ../memoba-deploy
```

```bash
cd ../memoba-deploy && vercel link --yes --project memoba
```

```bash
vercel deploy --prod
```

Then on the deployed URL check that:

- the provided demo account signs in through the email and password form;
- each suggested prompt completes with working citations;
- the Singapore prompt does not invent precedent;
- Import drafts from notes and Save indexes the case;
- a refresh keeps the answers;
- function logs show runs under the hosted deadline in `limits.ts`.

## 5. Reset between reviewers

```bash
npm run demo:reset -- --remote --app-url https://<your-app>.vercel.app
```

With `--app-url` (or `APP_URL`) the reset then signs in as the demo user and re-creates the three seeded conversations (separate from the suggested prompts), each with a real completed answer. This calls the model three times. Without it the conversations are left empty; run `npm run demo:conversations -- --app-url <url>` later.

This removes visitor cases, conversations, runs and briefs from the workspace `Memory Bank Demo` and refuses any other target. Seed cases stay. The seed step restores any seed case a visitor edited by saving the fixture content as a new revision.
