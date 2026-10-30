# UI presentation

Memoba uses a Framed sheet layout with shared tokens in `src/app/globals.css`. Next.js loads IBM Plex Sans. The workspace keeps one sidebar, one context header, and a white working sheet. Mobile navigation uses shadcn Sheet.

## Framework patterns

The Base UI variants of [shadcn AI Elements](https://ui.shadcn.com/docs/ai-elements) provide the conversation compositions. The shadcn CLI supplies the primitives in `src/components/ui`:

| Presentation | Primitives |
|---|---|
| Chat | Message Scroller, Message, Bubble |
| Chain of Thought | Trace, TraceCollapsible, TraceLine |
| Prompt Input | Input Group, Textarea, Button |
| Inline Citation | Hover Card, Button |
| Sources | Trace, TraceCollapsible |

These patterns receive Memoba's existing domain data. They do not require a new agent runtime or transport. The workspace ChatSession remains the connection owner. Refresh reads saved state without restarting generation.

## Evidence and activity

Streamdown renders Markdown without parsing raw HTML. A remark transform replaces validated source markers in prose with numbered citation controls. Code and link destinations remain unchanged. Source previews and the evidence panel use authorized saved excerpts, including their original revision and section. The link to the current case is labeled separately.

Evidence opens in a separate desktop column or a Sheet on smaller screens. Closing it returns focus to the source control.

Activity groups real events by stage or tool in first-seen order and writes each group as one plain sentence, such as "Searched your knowledge · 14 cases found" or "Wrote the answer". A count appears only when an event recorded it. The view shows no timestamps, state words, error codes, or operation totals; `activitySteps` in `src/modules/analysis/activity-presentation.ts` owns the wording. Run status owns the summary line. A failed step stays visible as one short line after a successful run, and interrupted steps read as stopped. The running step shimmers.

## Knowledge Hub

The Hub lists cases in a table (Case, Concepts, Template, Outcome, Status, Updated) built from `caseRows`. Status comes from the registry in `src/modules/cases/presentation.ts`: available, updating, preparing, failed, archived. Color sits on data only: outcome pills and status dots use a pale tint with dark text of the same hue. The case page uses a main column with a details rail that stacks below it on small screens.

Record, Edit, Import, and Archive open in `Dialog`. `/workspace/knowledge/new` redirects to `/workspace/knowledge?record=1` and `/workspace/knowledge/[id]/edit` redirects to `/workspace/knowledge/[id]?edit=1`; closing a dialog clears the parameter. Import is a state machine (notes, drafting, review or error). Its drafting line shows the real elapsed seconds, and its result summary reports only what the drafting response contains. Choices use the shadcn `Select` with `items`, and boolean or multi-choice options use `Checkbox`.

Domain, access, and persistence rules remain in [system contracts](../reference/system-contracts.md). The [Eve integration record](eve-chat-integration.md) describes the earlier viewport implementation, replaced by Message Scroller.
