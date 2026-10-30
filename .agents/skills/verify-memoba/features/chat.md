# Text conversations

A member sends a natural-language question, then continues a saved conversation. Questions persist when AI is unavailable.

## Sub-features

- `chat-intake` saves a version-2 message and bounded history.
- `chat-suggestions` fills the composer without sending.
- `chat-keyboard` sends with Enter, adds a newline with Shift+Enter, and ignores IME composition Enter.
- `chat-follow-up` retains immutable earlier snapshots and saved assistant context.
- `chat-history` reopens turns, scrolls independently, and reloads without another analysis.
- `chat-attempt` starts, stops, or retries an attempt with actual activity.
- `chat-mobile` navigates through the sidebar drawer.

## How to get to it

Sign in and open `/workspace`, choose **New chat**, or choose **The Memoba**. Legacy `/workspace/requests/new` redirects to `/workspace/chat`. Saved sidebar titles open `/workspace/chat/:id`. On mobile, open **Toggle Sidebar** first.

## Drive

Require UI login and Doctor. Disable both provider keys for the unavailable path. Record created conversation IDs.

1. Click **Launch to all customers**. Require the message in **What do you want to achieve?**, without navigation or a saved turn.
2. Replace it with a unique synthetic question that includes context and restrictions. There are no separate Context, Request type, or constraint fields. Blank input is rejected with **Enter your question.**
3. Check that Shift+Enter inserts a newline and IME Enter does not submit. Press Enter normally. Require real turn POST 200, analysis POST 503, and **Your question is saved; no model was called.**
4. Read `/api/conversations/:id`. Require one `{ version: 2, message, history: [] }` snapshot and no runs.
5. Send **Follow-up question**. Require **Turn 2**, an unchanged first snapshot, and prior user text in the second snapshot's history.
6. Reload while counting analysis POSTs. Require zero new attempts. Navigate to **Knowledge Hub**, then reopen the saved sidebar title.
7. With enough turns to overflow **Conversation messages**, scroll upward and use **Scroll to latest message**. Require the latest turn in view. `tests/e2e/chat-experience.spec.ts` supplies this longer recipe.
8. At 390 by 844, open **Toggle Sidebar**, then **Knowledge Hub**. Require the drawer to close. Check that the composer remains usable without horizontal overflow.

With real model access, stop an admitted run with **Stop analysis** and read its persisted cancellation. Choose **Retry analysis**, require a different run ID, and stop that attempt too. A saved question with no admitted run offers **Run analysis**. Navigate through the shared workspace during an active run and return to observe the saved result.

## Gotchas

Previous completed assistant answers enter model history as conversation context. They are not case evidence. History is bounded and rejected if it cannot fit; it is not silently truncated. Refresh reads saved state and does not resume generation.

The unavailable-model notice is transient. After reload, assert saved turns and no new run. Only the conversation author can append or retry; another member sees a read-only view. That branch needs a second authorized member fixture.

The helper covers short chat and mobile navigation. Long scrolling, active-stream navigation, and another author's conversation need separate coverage. There is no conversation-delete UI. Report retained synthetic IDs.
