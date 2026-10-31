# UI presentation

Memoba uses a full-bleed workspace layout with shared tokens in `src/app/globals.css`. Next.js loads Geist (Latin and Vietnamese subsets). The workspace keeps one sidebar (`variant="sidebar"`) and a white content area separated from it by a border, with no inset padding, radius, or shadow. Mobile navigation uses shadcn Sheet.

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

Streamdown renders Markdown without parsing raw HTML. A remark transform replaces validated source markers in prose with numbered citation controls. Code and link destinations remain unchanged. Source previews and the evidence panel use authorized saved excerpts, including their original revision and section. The link to the current case is labeled separately. A document source shows `Process · <heading>`, its type, area, effective date, and owner, and has no outcome line; its link reads "Open current document" and opens the cited block.

Evidence opens in a separate desktop column or a Sheet on smaller screens. Closing it returns focus to the source control.

Activity groups real events by stage or tool in first-seen order and writes each group as one plain sentence, such as "Searched your knowledge · 14 cases found" or "Wrote the answer". A count appears only when an event recorded it. A search event also records each source's state in its code, so the line can read "Searched cases and documents · 3 cases found · no documents matched"; runs saved before that code have the plain sentence. The view shows no timestamps, state words, error codes, or operation totals; `activitySteps` in `src/modules/analysis/activity-presentation.ts` owns the wording. Run status owns the summary line. A failed step stays visible as one short line after a successful run, and interrupted steps read as stopped. The running step shimmers.

## Knowledge Hub

The Hub has two tabs, Use cases and Documents, chosen with `?tab=documents` (default Use cases). The shared page frame, rail, dialog frame, badges, and time components live in `src/components`; cases and documents both use them. The Documents tab reuses the library layout: Document (name and description), Type, Area, Owner, Effective, and Status, sorted by name, with Type and Area filters, Include archived, and the Add document action. Add document and Edit document open a dialog with Name, Description, Content (paste, or a `.md` or `.txt` file read in the browser), and Details, and a live preview of the blocks the splitter will make, with the splitter's errors shown inline. The document page at `/workspace/knowledge/documents/[id]` has the same frame as a case: the description as the lede, rendered Markdown with a `#block-n` anchor per block, and a rail with Details, Sources, Contents, and Version history. Edit publishes a new version.

Cases are listed as follows. The Hub lists cases in a table (Case, Concepts, Template, Outcome, Status, Updated) built from `caseRows`. Status comes from the registry in `src/modules/cases/presentation.ts`: available, updating, preparing, failed, archived. Color sits on data only: outcome pills and status dots use a pale tint with dark text of the same hue. The case page has one 48px header (back, title, Archive, Edit case) and scrolls as one page. A single column of sections follows `sectionOrder`, and a 340px rail on the right holds two bordered layers: details, sources and related cases, then version history. Header and body share `--page-inset`, so the rail's right edge sits on the Edit case button's right edge; the rail stacks below the article at 1280px and under. The UI says "version" for what the code and database call a revision, and `versionRows` in `src/modules/cases/revision-history.ts` computes each version's change summary.

Record, Edit, Import, and Archive open in `Dialog`. `/workspace/knowledge/new` redirects to `/workspace/knowledge?record=1` and `/workspace/knowledge/[id]/edit` redirects to `/workspace/knowledge/[id]?edit=1`; closing a dialog clears the parameter. Import is a state machine (notes, drafting, review or error). Its drafting line shows the real elapsed seconds, and its result summary reports only what the drafting response contains. Choices use the shadcn `Select` with `items`, and boolean or multi-choice options use `Checkbox`.

Domain, access, and persistence rules remain in [system contracts](../reference/system-contracts.md). The [Eve integration record](eve-chat-integration.md) describes the earlier viewport implementation, replaced by Message Scroller.
