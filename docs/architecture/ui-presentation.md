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

Activity groups real events by stage or tool in first-seen order. Event records have no call identifier, so the UI reports operation totals rather than pairing parallel calls. Run status owns the summary. A failed operation remains visible after a successful run, and interrupted operations remain unfinished.

Domain, access, and persistence rules remain in [system contracts](../reference/system-contracts.md). The [Eve integration record](eve-chat-integration.md) describes the earlier viewport implementation, replaced by Message Scroller.
