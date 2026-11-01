# Landing page design

The prototype is [`docs/superpowers/prototypes/landing.html`](../prototypes/landing.html). Treat its copy as final and its CSS as a reference. It replaces the page in `src/app/page.tsx`.

## Idea

Cases are circles and documents are squares. This is the product's separation of what happened from what is required, turned into the page's one motif: citation chips, the Two memories fields, the Engine lanes, and the wordmark all use it. Teal `--chart-1` (`#1b6c80`) marks cases, and primary `#20282c` marks documents. Red appears only for a failed source. The page uses the workspace tokens and the system font, so it reads as the same product at a larger scale. [Visual style](#visual-style) sets its shape, type, frame, and colour.

## Sections and final copy

Take every string from the prototype. The structure is:

| Section | Headline | Content |
|---|---|---|
| Header | none | Wordmark, three anchor links, "Open the demo". Links hide below 900px. The button never hides |
| Hero | Your team already solved this. Nobody remembers where. | Lede, button, framed chat answer with the evidence panel floating over it. The phone uses a phone capture and drops the float |
| Problem | The ticket survives. The reasoning doesn't. | Framed capture of the real recurring invoices case with a small illustrative "Done" ticket floating over it, then a four-column list of what the ticket lost. The caption says the ticket is an illustration |
| Two memories | Cases say what happened. / Documents say what is required. | Two ruled cells, each with a cropped case or document page, stacked on phones |
| Engine | A chatbot answers from what it's given. Memoba goes and reads. | One diagram in five steps. See [Engine diagram](#engine-diagram) |
| Workspace | See what the team knows, and where it's thin. | Knowledge Hub and Dashboard frames. The Dashboard keeps its Sample data label |
| Honesty | When they differ, you get both sides. | Real answer crop and four rules |
| Close | Ask the demo workspace a real question. | States that Northwind Ledger is fictional. Button, full-width wordmark |

## Visual style

The first restyle was too round and too loose for a product made of square tables and documents. This system replaces it. Copy and section order do not change. The only additions are a mono index (`01 / 07`) and a short eyebrow. The eyebrows are, in order: Overview, The problem, Two memories, How it answers, Workspace, What it won't say, Try it. They are reader-facing names, never internal ones.

| Area | Rule |
|---|---|
| Corners | 0 for buttons, stages, cells, and captures. 8px only for floating overlays. A circle appears only as the case motif, so round is a case and square is a document |
| Type | The system font for text. IBM Plex Mono (400, 500) loads through `next/font/google` in `src/app/page.tsx`, so the workspace never loads it. Mono is 12px uppercase with 0.06em tracking for eyebrows, buttons, nav, the section index, and Engine controls. H1 is at most 56px and H2 at most 48px, weight 500, tracking -0.03em, line-height 1.1. Body is 16px |
| Frame | One column of at most 1360px between 1px rails. Sections end in a 1px line instead of a filled block. Adjacent cells have no gap and meet on a line. The Problem list is a four-cell table and the Honesty rules are a ruled list |
| Spacing | A section heading takes at most 64px above and 56px below it. A stage sits on the line under its heading. No padding passes 64px |
| Colour | `--case` teal and `--doc` ink are unchanged. No background is a gradient. Surfaces use flat tints of `--case` (`color-mix` with white) and a 24px hairline grid on stages and the Engine board. The only gradient is the accent stroke inside the Engine diagram, which runs `--chart-1`, `--chart-2`, `--chart-3` |
| Hero | Left aligned. A square two-tint staircase behind the capture, flat colour, `aria-hidden`, decorative, no animation. The Close band repeats the same stair as a flat strip |
| Engine | See [Engine diagram](#engine-diagram) |

## Product screens

Captures live in `public/landing/`, taken at 2x from the local demo workspace (3x for the phone). The answer is a real saved run of the `process-plus-case` question from `evals/text/scenarios.json`, which returned `19 cases found · 5 documents found` and cited three cases and the release procedure. Each capture sits in a square stage on the line below its heading, cropped at the bottom edge, with a 1px outline and no shadow. Only floating overlays (the evidence panel and the ticket) take 8px and a shadow.

| File | Used in |
|---|---|
| `chat-answer.png`, `chat-answer-phone.png`, `evidence-panel.png` | Hero |
| `recurring-case.png`, `recurring-case-phone.png` | Problem |
| `case-page.png`, `document-page.png` | Two memories |
| `knowledge-hub.png`, `dashboard.png` | Workspace |
| `answer-differ.png` | Honesty |
| `citation-evidence.png` | Source of `evidence-panel.png` |

The local workspace holds leftover e2e data, so the capture hid those rows in the sidebar and Knowledge Hub, the Hub's case count, and the dev badge. Nothing else on screen was changed, and no seed content was edited. Lazy-load the images below the hero in the build.

## Engine diagram

The section answers one question for a PM: how does the agent find the right information without being stuffed and without bluffing like a chatbot? The reader should leave with this: a chatbot answers from what it is given. Memoba goes and finds it, reads only what is relevant, and can cite only what it read. The application holds the limits, so the design scales. The diagram is there to make that visible. It is not a specification.

One canvas, five steps. Each step adds one layer, and the layer just added carries the accent stroke. Case is a circle, document is a square. Nothing shows a number, a function name, or a ranking method. The solution sheet and storyboard behind it are working notes and are not committed.

| Step | Adds | Caption |
|---|---|---|
| 1 A chatbot | Question, Model, Answer, a full "what the model is holding" gauge | A chatbot answers from whatever text is pushed into it, so the model is full and the answer can't be opened to check. |
| 2 Give it a tool | Search and the team's cases and documents | Give the same model a search tool and it goes to the team's cases and documents itself, by keyword and by meaning. |
| 3 Filter before reading | Short list, opened and read, citations on the Answer. The gauge drops to the few sources read | Many sources shrink to a short list and only a few are opened, so the model holds just what it read. |
| 4 The application keeps the rules | A frame, a stop limit, a read limit, a citation check. A citation to something unread is blocked | The model decides what to look at. The application decides how far it may look, when it stops, and checks every citation. |
| 5 Room to grow | Three dashed sockets tagged Planned: MCP, Skills, Permission | The same frame has room to grow: three planned sockets for tools, working methods and permissions. |

What the page must not say: no claim that a citation proves an answer correct, no "no hallucination", and nothing that suggests the three sockets exist. The found, none and failed search states and the run data are not in the diagram. The Honesty section owns that rule.

Code, in `src/components/landing/`:

| File | Owns |
|---|---|
| `engine-timeline.ts` | The five steps, every string, the timing, and the illustrative marks (24, 6, 3). No coordinates |
| `engine-layout.ts` | Hand-placed geometry for the wide layout and the vertical phone layout |
| `engine-edges.ts` | The connections and the step that adds each |
| `engine-board.tsx` | The SVG for one layout at one step |
| `engine.tsx` | The clock, the controls, and the fallback list |

Geometry: nodes are square and edges are orthogonal. The wide layout is the five steps on a canvas of 1200 by 670. Below 900px a separate vertical layout is rebuilt for 360 wide, and both SVGs are in the page with CSS choosing one, so nothing flips on hydration. The gauge is an illustration of how much the model carries and has no scale.

Playback: one `requestAnimationFrame` clock moves the step. It starts when 35% of the board is visible, stops when it leaves or the tab is hidden, loops after step 5, and caps each frame's delta at 50ms. Step 3 has two moments inside it: the short list forms, then the sources open. Layers fade in, new edges draw in, and marks move by CSS transition off the step state. No looping animation runs, so at most the edges added in one step move at once, well under 12. Controls are Back, Play or Pause, Next, and five step buttons, with Back and Next pausing. Phones hide the step buttons and pin the caption and controls to the bottom edge while the board scrolls.

Reduced motion and no JavaScript: the board rests on step 5 and the five steps are rendered as a list. The server renders that same state. With JavaScript and motion allowed, the board snaps to step 1 when it first scrolls into view.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Story | Five layers on one canvas, starting from a chatbot | The difference is the added structure, so the reader sees it appear |
| Accent | The newly added layer only | Shows what changed without a legend |
| Hold gauge | Appears in steps 1, 3, 4, 5 as an unlabelled-quantity illustration | Full against small is the contrast. A number would invite a question about it |
| Search states | Not in the diagram | Rule lives in the Honesty section. Showing it here added load |
| Planned work | Dashed sockets tagged Planned, drawn unlike the solid frame | It must not read as built |
| Colour | No gradient backgrounds. Gradient only as the diagram accent | Flat tints and a hairline grid keep the page calm without looking raw |
| Header action | Always `/login`, labelled "Open the demo" | Signed-in users never see this page |
| Pictures | Real product captures only | The owner asked for real product imagery, framed as flat stages on lines in the manner of llamaindex.ai without copying its identity |

## Signed-in redirect

`src/proxy.ts` does not cover `/`, so make `src/app/page.tsx` an async server component. Call `createServerSupabase()`, then `auth.getUser()`, and `redirect("/workspace/chat")` when a user exists. On no user or an auth error, render the landing page. Do not use `requireWorkspace`, which throws for visitors. Remove `readAIConfig` and the old badge from this page. The page becomes dynamic, which is acceptable here.

## Components

- `src/app/page.tsx`: redirect, composition.
- `src/components/landing/site-header.tsx`: sticky bar.
- `src/components/landing/engine*.ts(x)`: the Engine diagram. See [Engine diagram](#engine-diagram) for the files.
- Other sections stay server-rendered in `src/components/landing/sections.tsx`.

The Engine reads `prefers-reduced-motion` through `matchMedia`. The 900px switch between layouts is CSS.
