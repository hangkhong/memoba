# Eve chat integration

Memoba adapts the [Eve chat template](https://github.com/vercel/eve/tree/1cf022a6d2c096d30c62024dade8f093b456947e/apps/templates/eve-chat-template) for an evidence-backed workspace product. The template supplies chat presentation patterns. Memoba's services continue to own structured requests, case knowledge, retrieval, analysis, and briefs.

## Presentation and execution

`conversations/conversation.tsx` adapts Eve's conversation viewport through `use-stick-to-bottom`. It follows new content while the reader is at the bottom. Scrolling upward suspends following and exposes a button to return to the latest message. The composer stays below the transcript, with its structured details in a bounded panel.

`conversations/composer.tsx` keeps React Hook Form, Zod, and the existing save-before-analysis sequence. Enter submits the question, Shift+Enter inserts a newline, and composing input does not submit. Stop uses the existing cancellation command.

`analysis/activity.tsx` presents actual analysis events in a compact disclosure. The conversation selects one activity source for an attempt rather than rendering both saved and live lists. Standalone run pages use the same activity component.

`conversations/chat-session.tsx` remains the connection owner in the workspace layout. The adapter reads AI SDK stream chunks without exposing transport types to the presentation. A terminal result and a disconnected stream remain different outcomes. Refresh reads saved state and does not restart generation.

Briefs keep their structured claims, section and revision citations, source access checks, and separate user edits. Chat presentation does not convert prior assistant answers into knowledge.

## Design choice

Two designs were considered. A direct presentation over `ConversationDetail` keeps one domain model. A separate presentation reducer could centralize lifecycle policy, but would add another representation for the same single chat surface.

The implementation uses direct presentation. It takes the second design's safeguards for matching live attempts, selecting one activity log, and keeping conversation polling in one place. Supabase stays the persistence owner and the bounded Memoba harness stays the execution owner.

Adopting `useEveAgent` would require Eve's session protocol, identity adapter, event persistence, and runtime. This integration does not install Eve or claim durable generation resume. Confirmed requirements for those capabilities can trigger a separate runtime decision under [ADR-0003](adr/0003-bounded-harness-ai-sdk.md).

The current scope remains one demo workspace. This change does not add tenant onboarding, billing, or external connections. Domain rules and limits remain in [system contracts](../reference/system-contracts.md). Source attribution is in [third-party notices](../../THIRD_PARTY_NOTICES.md).

## Verification

On 2026-10-28, a clean `npm ci`, lint, typecheck, 62 Vitest tests, 80 native SQL assertions, eight non-model Playwright tests, and the production build passed. Browser checks cover keyboard submission, IME protection, long-conversation scrolling, mobile intake, saved request snapshots, access, and case history. The archive regression waits for its real API response and checks the saved lifecycle.

Live-model tests remain paused. This verification does not establish a successful generated brief, semantic citation support, or live cancellation with a provider. The brief renderer and evidence services retain their existing contracts.
