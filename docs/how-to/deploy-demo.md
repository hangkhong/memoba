# Deploy the hosted demo

Draft: these steps have not been run against real projects. Record the first deployment's results in [evaluation status](../reference/evaluation.md).

You need a Supabase Cloud project, a Vercel Hobby project connected to this repository, and a dedicated OpenAI project with a hard spending limit. The spending limit and `concurrentRuns` in [`limits.ts`](../../src/lib/contracts/limits.ts) bound cost; the app has no rate limit.

## 1. Prepare variables

Copy [`.env.example`](../../.env.example) to `.env.local`. Put `SUPABASE_URL` and `SUPABASE_SECRET_KEY` there for scripts only. Do not add them to Vercel.

## 2. Prepare Supabase Cloud

Link the project and apply the migrations with the pinned CLI:

```bash
npx supabase link --project-ref <project-ref>
```

```bash
npx supabase db push
```

In Auth settings, disable public sign-up. Then seed the corpus and the demo account:

```bash
npm run db:seed -- --demo --remote
```

Expected: the seed reports the case count with index state ready. Seeding is incremental; rerunning embeds only missing cases. The seed sets the demo user's password to `DEMO_PASSWORD` every run, so `npm run demo:reset -- --remote` also recovers the account if a reviewer changes it.

## 3. Configure Vercel

Create the project from the GitHub repository on the Hobby plan with Fluid Compute and Node.js 24. Set these Production variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `OPENAI_API_KEY`, `AI_REASONING_MODEL`, `AI_EMBEDDING_MODEL`, `AI_EMBEDDING_DIMENSIONS`. Do not set `DEMO_EMAIL` or `DEMO_PASSWORD` in Vercel; only the scripts read them. Reviewers sign in with the provided account on the normal form.

## 4. Deploy and verify

Deploy, then on the deployed URL check that:

- the provided demo account signs in through the email and password form;
- each suggested prompt completes with working citations;
- the Singapore prompt does not invent precedent;
- Import drafts from notes and Save indexes the case;
- a refresh keeps the answers;
- function logs show runs under the hosted deadline in `limits.ts`.

## 5. Reset between reviewers

```bash
npm run demo:reset -- --remote
```

This removes visitor cases, conversations, runs and briefs from the workspace `Memory Bank Demo` and refuses any other target. Seed cases stay. The seed step restores any seed case a visitor edited by saving the fixture content as a new revision.
