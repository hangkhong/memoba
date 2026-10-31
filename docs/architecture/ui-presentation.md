# UI presentation

Memoba uses a full-bleed workspace layout with shared tokens in `src/app/globals.css`. Next.js loads Manrope (Latin and Vietnamese subsets); code stays in the system monospace font. The workspace keeps one sidebar (`variant="sidebar"`) and a white content area separated from it by a border, with no inset padding, radius, or shadow. Mobile navigation uses shadcn Sheet.

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

`SafeMarkdown` in `src/components/safe-markdown.tsx` is the one Markdown renderer: Streamdown with `skipHtml` and without the `raw` plugin, so raw HTML never parses. A remark transform replaces validated source markers in prose with numbered citation controls. Code and link destinations remain unchanged. Source previews and the evidence panel use authorized saved excerpts, including their original revision and section.

The Sources line under an answer counts unique cases and documents, not excerpts. Each row is a `Case` or `Document` label, the source name, and one tag button per cited section that opens that excerpt in the panel (`groupEvidenceSources` in `src/modules/briefs/evidence-sources.ts`). A case tag is the section name; a document tag is the last step of its heading path. Tags that share a label within one source get an ordinal.

The evidence panel has one layout for both kinds: the label (`Case · <section>` or `Document · <heading>`), the source title, the cited text in a `blockquote`, a `DetailRows` block, and one button-styled link. Case rows are Outcome and Recorded, and the link opens the current case. Document rows are Version, Effective, Type, Area, and Owner, and the link "Open cited section" opens that version at `#block-<block>`. Revision, section, and author IDs are not shown. A document excerpt renders as Markdown at panel scale (`.evidence-markdown`, with wide tables scrolling inside), minus a first heading that repeats the panel's own; the hover preview shows it as plain text. A case excerpt stays plain text. Tables and code blocks render on the page with no box, border or fill; `SafeMarkdown` overrides them with the shadcn `Table` and `CodeBlock` (highlighted with shiki), and both scroll sideways when wide. Dates use one format, `1 Jan 2026` (`formatDate` in `src/lib/format-date.ts`).

Evidence opens in a separate desktop column or a Sheet on smaller screens. Closing it returns focus to the source control.

Activity groups real events by stage or tool in first-seen order and writes each group as one plain sentence, such as "Searched your knowledge · 14 cases found" or "Wrote the answer". A count appears only when an event recorded it. A search event also records each source's state in its code, so the line can read "Searched cases and documents · 3 cases found · no documents matched"; runs saved before that code have the plain sentence. The view shows no timestamps, state words, error codes, or operation totals; `activitySteps` in `src/modules/analysis/activity-presentation.ts` owns the wording. Run status owns the summary line. A failed step stays visible as one short line after a successful run, and interrupted steps read as stopped. The running step shimmers.

## Knowledge Hub

The Hub has two tabs, Use cases and Documents, chosen with `?tab=documents` (default Use cases). The shared page frame, rail, dialog frame, badges, and time components live in `src/components`; cases and documents both use them. The Documents tab reuses the library layout: Document (name and description), Type, Area, Owner, Effective, and Status, sorted by name, with Type and Area filters, Include archived, and the Add document action. Add document and Edit document open a dialog with Name, Description, Content (paste, or a `.md` or `.txt` file read in the browser through a Choose a file button), Details, and Sources, and a live preview of the blocks the splitter will make, with the splitter's errors shown inline. The document page at `/workspace/knowledge/documents/[id]` has the same frame as a case: the description as the lede, rendered Markdown with a `#block-n` anchor per block, and a rail of three layers: Content (the block list, open by default, collapsed from its header; the article does not collapse), Metadata (Details and Sources), and Version history. Edit asks for a note on what changed and why and publishes a new version. The rail's Version history lists each version's number, date, author, and note; an earlier version opens at `?version=N` read only, under a banner that links to the current version. The evidence panel for a document shows its version and effective date, and when a newer version exists or the document was archived it says so above the unchanged cited text.

Cases are listed as follows. The Hub lists cases in a table (Case, Concepts, Template, Outcome, Status, Updated) built from `caseRows`. Status comes from the registry in `src/modules/cases/presentation.ts`: available, updating, preparing, failed, archived. Color sits on data only: outcome pills and status dots use a pale tint with dark text of the same hue. The case page has one 48px header (back, title, Archive, Edit case) and scrolls as one page. A single column of sections follows `sectionOrder`, and a 340px rail on the right holds two bordered layers: details, sources and related cases, then version history. Header and body share `--page-inset`, so the rail's right edge sits on the Edit case button's right edge; the rail stacks below the article at 1280px and under. The UI says "version" for what the code and database call a revision, and `versionRows` in `src/modules/cases/revision-history.ts` computes each version's change summary.

Record, Edit, Import, and Archive open in `Dialog`. `/workspace/knowledge/new` redirects to `/workspace/knowledge?record=1` and `/workspace/knowledge/[id]/edit` redirects to `/workspace/knowledge/[id]?edit=1`; closing a dialog clears the parameter. Import is a state machine (notes, drafting, review or error). Its drafting line shows the real elapsed seconds, and its result summary reports only what the drafting response contains. Both forms use `FormDialogBody` and `FormDialogFooter`, the shared `FormSection` (24px above and below each divider), and `SourceFields` (Label and URL columns named once, an icon Remove button). Effective from is a `Calendar` in a `Popover` that shows `31 Oct 2026`, keeps an ISO date, and disables days after today. Choices use the shadcn `Select` with `items`, and boolean or multi-choice options use `Checkbox`.

A conversation's author sees a trash action on its sidebar row (shown on hover, always visible on touch widths). It opens a confirmation `Dialog` with the title, and a failed delete shows its error inside the dialog. After a delete the sidebar refreshes, and an open conversation goes to `/workspace/chat`. The delete is permanent.

## Dashboard

`/workspace/dashboard` answers whether the knowledge base works and what the PM should do next. Its design and rationale are in the [Dashboard design](../superpowers/specs/2026-10-31-dashboard-design.md). The page title states the finding, and `PageBar` carries a `Sample data` pill while `getDashboardSnapshot()` in `src/modules/dashboard/service.ts` returns the sample in `sample-snapshot.ts`. Thresholds and the queue weighting are constants in `snapshot.ts`; `metrics.ts` derives every figure from the snapshot rows and `buildAttentionQueue` in `attention.ts` ranks the queue.

The page frame is `PageFrame` and `PageBar` without `PageBody`, and the layout follows the width of the content area (`@container`, with `@max-[1000px]` and `@max-[640px]`), not the viewport, because the sidebar changes the space. Sample titles resolve to real case and document IDs at render time; a row that does not resolve prints no action. Metric help is a `Popover` opened by an info button, so it works by touch and keyboard. The sidebar lists New chat, Dashboard, and Knowledge Hub, and puts a disabled Roadmap item with a "Soon" label above Sign out.

Domain, access, and persistence rules remain in [system contracts](../reference/system-contracts.md). The [Eve integration record](eve-chat-integration.md) describes the earlier viewport implementation, replaced by Message Scroller.
