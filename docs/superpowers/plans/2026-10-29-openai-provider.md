# Add direct OpenAI support

Use the user's OpenAI API key for embedding and reasoning in Memoba. Keep Google available through the AI SDK registry. Deliver one focused integration change. The user added the key and authorized implementation on 2026-10-29.

## Confirmed scope

- Use `text-embedding-3-small` with 1536 dimensions.
- Use `gpt-6-luna` through Responses with reasoning effort `low`.
- Keep the deterministic planner.
- Do not add a comparison model, automatic model fallback, benchmarks, or a semantic evaluation campaign.
- Verify runtime, data safety, and the real case-to-brief flow with a small number of paid calls.
- Preserve the existing RLS, immutable revisions, historical citations, cancellation, and 90-second deadline.

## Add the key manually

- [x] Open the existing repository `.env.local` in a text editor.
- [x] Add or update one `OPENAI_API_KEY` entry with the real key. Keep the Supabase variables and existing model settings until the implementation updates them together.
- [x] Save the file. Do not paste the key into chat, terminal commands, or committed files. Do not use a `NEXT_PUBLIC_` prefix.
- [x] Tell the implementation owner that the key is ready. Do not run the current Google-only `ai:probe` to verify OpenAI access.

The file is already ignored by Git. `scripts/configure-local.ts` preserves entries other than the two public Supabase variables. The implementation owner checks only whether the OpenAI key is present and nonempty, without printing its value.

## Wire the provider registry

- [x] Read the installed AI SDK 7 docs and choose a compatible stable `@ai-sdk/openai` release. Update `package.json` and `package-lock.json`.
- [x] Extend `src/lib/config/env.ts` with validated, independently selectable reasoning and embedding model references. Require credentials only for providers used by those roles.
- [x] Update `src/lib/ai/models.ts` with the SDK provider registry. Register direct Google and OpenAI adapters. Explicitly use OpenAI Responses for reasoning.
- [x] Keep provider-specific options behind the AI adapter. Use the same model configuration for generation and repair in `src/modules/analysis/agent.ts`.
- [x] Keep `src/lib/ai/embeddings.ts` as the shared SDK boundary. Validate dimensions and vectors for both providers.
- [x] Review Structured Outputs and tool schemas against the OpenAI provider. Keep domain validation and citation validation after generation.
- [x] Review the current 2000-token output cap because OpenAI reasoning consumes that budget. Make the smallest budget adjustment required by the smoke check, in the owning limits configuration. Keep the total deadline.

Check this unit with focused config and adapter tests plus typecheck. Confirm that OpenAI-only configuration works without a Google key and missing credentials produce the existing unavailable behavior.

## Migrate the searchable corpus safely

- [x] Add a new SQL migration. Do not edit applied migrations. Replace Gemini-only model checks in revision admission and search with an explicit supported embedding profile contract.
- [x] Keep vector columns and indexes at 1536 dimensions. Search only within the requested supported profile. Reject mismatches instead of mixing vectors.
- [x] Add an idempotent migration command for active cases. Inspect the existing save and publication RPCs before choosing the final implementation. Prefer new revisions with unchanged content and the OpenAI embedding profile. Preserve old revisions and saved citation access.
- [x] Publish each replacement revision only after its index is ready. Report failures and allow retry without duplicating revisions. Verify migration completion before enabling OpenAI retrieval for normal use.
- [x] Update the seed logic to inspect the embedding profile instead of skipping every case with a ready revision.
- [x] Regenerate database types if the migration changes RPC contracts.

Check this unit with focused SQL assertions for profile mismatch rejection, publication after successful indexing, membership isolation, and historical citation access. Verify the migration command's idempotency without generating duplicate paid embeddings.

## Update operational commands

- [x] Make `scripts/probe-ai.ts` and `scripts/seed-demo.ts` use the shared provider configuration. Check Node script compatibility with existing import conventions.
- [x] Update `scripts/doctor.ts` to report availability and model IDs without secrets.
- [x] Clear OpenAI credentials in offline test and CI environments wherever Google credentials are already cleared.
- [x] Update `.env.example`, `docs/how-to/run-locally.md`, and `docs/reference/system-contracts.md` with the actual supported configuration and corpus migration command.
- [x] After the adapter works, set local model references to `openai:gpt-6-luna` and `openai:text-embedding-3-small`, with dimensions 1536. Keep credential values out of tool output.

Check this unit by running the offline doctor and focused script/config checks. Inspect the diff for accidental secret exposure.

## Verify the real runtime once

- [x] Run one small embedding capability probe. Confirm the response has 1536 finite values per vector.
- [x] Migrate the existing active corpus to OpenAI embeddings. This is required indexing work, not a model evaluation run.
- [x] Start the app with `npm run dev`. Open the browser and create or reuse a small test case. Confirm index readiness and retrieval under the OpenAI profile.
- [x] Run one structured analysis through the real browser flow. Confirm a persisted terminal result, a valid brief, authorized citations, refresh persistence, actual activity events, and deadline enforcement.
- [x] Ensure tool execution is covered. If the browser run does not request a tool, use one bounded capability probe that forces a harmless function call. Keep mocked offline tests for budget and cancellation behavior.
- [x] If the smoke run fails, diagnose and repeat only the failed check. Do not run broad model comparisons or the full challenge suite.
- [x] Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:db`, and `npm run build` once after the final code change. Run the relevant browser regression coverage once. Repeat only affected checks after fixes.

Record model IDs, dimensions, actual call counts, usage, final states, and any unresolved runtime failures. Separate passed checks from planned checks. Do not claim semantic quality from this smoke check.

## Completion criteria

- [x] Both AI roles work with only an OpenAI key.
- [x] Existing cases are searchable with the new profile, and saved historical citations still resolve.
- [x] One real case-to-brief flow completes and persists correctly.
- [x] Offline regression checks pass without paid API calls.
- [x] Setup and migration documentation match the delivered commands.

Apply Laziness Protocol by reusing the existing adapters and SDK registry. Apply Sequence Work into Verifiable Units by checking each integration step before the next. Apply Prove It Works through the real browser flow. The user's request limits live model checks to runtime smoke verification.

## Verified delivery on 2026-10-29

- The small embedding probe returned one 1536-dimensional vector and reported 6 tokens.
- The active unpublished case received a new OpenAI revision. A second migration run indexed zero cases and reused the ready revision.
- The browser created one labelled synthetic case, then submitted one structured question. Its first analysis attempt was rejected because the emitted schema used `oneOf`. A minimal diagnostic request confirmed the schema error.
- After the schema fix, the browser retried the same saved turn. The completed run executed `search_knowledge`, created a valid persisted brief, opened its citation, and survived refresh without another analysis. No extra tool probe or model comparison was needed.
- The completed analysis reported 8188 input tokens, 1395 output tokens, and 9583 total tokens. The existing output cap was sufficient and remains unchanged. Per-request embedding usage across retrieval is not persisted by the existing telemetry.
- Final checks passed once after the code changes: lint, typecheck, production build, 65 Vitest tests, 94 SQL assertions, and 8 browser regression tests. Offline checks disabled both provider keys.
- Ignored runtime evidence is in `.superpowers/verification/openai-runtime/`, including `case-ready.png`, `brief-citations.png`, `results.json`, and `retry-results.json`. The first results file retains the rejected attempt.
- The labelled smoke case and saved conversation remain as inspectable local demo records. Historical data was not deleted.

Design sketch one was selected for its smaller existing-factory interface. The expected-source revision check from sketch two was retained. Workspace-wide activation was rejected for this single local workspace. Cross-family judging was unavailable under the user's inherited-model setting. The optional external `deslop` skill was unavailable; the parent reviewed the scoped diff and a separate comment review found no new suppressions or required removals.
