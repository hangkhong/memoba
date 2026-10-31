# Landing page design

The prototype is [`docs/superpowers/prototypes/landing.html`](../prototypes/landing.html). Treat its copy as final and its CSS as a reference. It replaces the page in `src/app/page.tsx`.

## Idea

Cases are circles and documents are squares. This is the product's separation of what happened from what is required, turned into the page's one motif: citation chips, the Two memories fields, the Engine lanes, and the wordmark all use it. Teal `--chart-1` (`#1b6c80`) marks cases, and primary `#20282c` marks documents. Red appears only for a failed source. The page uses the workspace tokens and Manrope, so it reads as the same product at a larger scale.

## Sections and final copy

Take every string from the prototype. The structure is:

| Section | Headline | Content |
|---|---|---|
| Header | none | Wordmark, three anchor links, "Open the demo". Links hide below 900px. The button never hides |
| Hero | Your team already solved this. Nobody remembers where. | Lede, button, framed chat answer with the evidence panel floating over it. The phone uses a phone capture and drops the float |
| Problem | The ticket survives. The reasoning doesn't. | A "Done" ticket beside the four things it lost, all from the recurring invoices case |
| Two memories | Cases say what happened. / Documents say what is required. | Two tinted panels, each with a cropped case or document page, stacked on phones |
| Engine | Follow one question through the engine. | Interactive diagram below |
| Workspace | See what the team knows, and where it's thin. | Knowledge Hub and Dashboard frames. The Dashboard keeps its Sample data label |
| Honesty | When they differ, you get both sides. | Real answer crop and four rules |
| Close | Ask the demo workspace a real question. | States that Northwind Ledger is fictional. Button, full-width wordmark |

## Product screens

Captures live in `public/landing/`, taken at 2x from the local demo workspace (3x for the phone). The answer is a real saved run of the `process-plus-case` question from `evals/text/scenarios.json`, which returned `19 cases found · 5 documents found` and cited three cases and the release procedure. Frames follow a tinted panel, 12px radius, and a soft shadow, cropped at the bottom edge.

| File | Used in |
|---|---|
| `chat-answer.png`, `chat-answer-phone.png`, `evidence-panel.png` | Hero |
| `case-page.png`, `document-page.png` | Two memories |
| `knowledge-hub.png`, `dashboard.png` | Workspace |
| `answer-differ.png` | Honesty |
| `citation-evidence.png` | Source of `evidence-panel.png` |

The local workspace holds leftover e2e data, so the capture hid those rows in the sidebar and Knowledge Hub, the Hub's case count, and the dev badge. Nothing else on screen was changed, and no seed content was edited. Lazy-load the images below the hero in the build.

## Engine timeline

Keep this as data in `src/components/landing/engine-timeline.ts`, and keep layout coordinates apart from it. The prototype's `VAR`, `COMMON`, and `LAYOUT` hold the exact strings and geometry.

```ts
type NodeId = "q" | "admit" | "search" | "cp" | "dp" | "rc" | "rd" | "write" | "check" | "save";
type Run = {
  id: "found" | "none" | "failed";
  code: string;            // the real search event code
  path: NodeId[];          // nodes the token visits, in order
  recedes: `${NodeId}>${NodeId}`[]; // unchosen edges
  documentState: "found" | "none" | "failed";
  answerProcessText: string;
};
const runs: Run[] = [
  { id: "found", code: "cases:found:4;documents:found:1", path: ["q","admit","search","cp","rc","rd","write","check","save"], recedes: ["rc>write"], documentState: "found", answerProcessText: "..." },
  { id: "none", code: "cases:found:4;documents:none:0", path: ["q","admit","search","cp","rc","write","check","save"], recedes: ["rc>rd","rd>write","dp>rd"], documentState: "none", answerProcessText: "..." },
  { id: "failed", code: "cases:found:4;documents:failed:0", path: ["q","admit","search","cp","rc","write","check","save"], recedes: ["rc>rd","rd>write","dp>rd"], documentState: "failed", answerProcessText: "..." },
];
```

Timing: 1.25s hold, 1s along an edge with cubic ease in and out, 1.7s along the dashed trace, 0.45s rest. One `requestAnimationFrame` clock drives the token transform and edge fill, and arrival calls one render for the note, progress, and answer panel, so they cannot drift. Node activation and the receding branch are CSS transitions off that render. The token passes under node boxes and parks 12 units outside the next node, so it never covers a label.

Geometry: the wide map has five columns, with Question and Admission stacked left and Write, Check citations, and Save stacked right. That gives each node 176 units instead of squeezing eight columns.

Mapping to the product: `search`, `rc`, and `rd` are the `search_knowledge`, `read_case`, and `read_document` tool events. `admit` is the intake stage, `check` is the validation stage, and the codes follow [system contracts](../../reference/system-contracts.md). The diagram simplifies the agent loop to one pass. A real run can search and read several times, and search can repeat.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Playback | Starts when 35% of the board is visible, pauses when it leaves, and loops through the three outcomes | The diagram needs no click to make sense, and it does not run unseen |
| Controls | Outcome buttons, Pause, Back, Next, Replay | Moving content needs a pause control. Picking an outcome plays it once and stops |
| One token | Token visits cases, then documents | Searches really settle separately, but the owner asked for one token. Both lanes' states appear when the token reaches search |
| Decision point | After `read_case`, the document path or the direct path recedes | The choice is visible, and the three outcomes share one diagram |
| Dashed trace | Returns to the question, labelled as a record you can reopen | Saved answers do not enter the knowledge base, so the note says this and the trace never reaches the sources |
| Reduced motion | No token and no autoplay. Final state of the selected outcome, plus all three outcomes as lists | Complete information without travel. Without JavaScript the lists are the fallback, so render them on the server |
| Phone | Vertical map with the lanes side by side, and the note pinned under the header | A shrunken wide map is unreadable, and a note below the map would fall out of step |
| Dependencies | None. SVG, CSS, one client component | `getPointAtLength` covers the token |
| Header action | Always `/login`, labelled "Open the demo" | Signed-in users never see this page |
| Colour on scroll | None. Fields are fixed per section | The Engine is the one moving thing on the page |
| Pictures | Real product captures only | The owner asked for real product imagery, framed in the style of reorc.com without copying it |

## Signed-in redirect

`src/proxy.ts` does not cover `/`, so make `src/app/page.tsx` an async server component. Call `createServerSupabase()`, then `auth.getUser()`, and `redirect("/workspace/chat")` when a user exists. On no user or an auth error, render the landing page. Do not use `requireWorkspace`, which throws for visitors. Remove `readAIConfig` and the old badge from this page. The page becomes dynamic, which is acceptable here.

## Components

- `src/app/page.tsx`: redirect, composition.
- `src/components/landing/site-header.tsx`: sticky bar.
- `src/components/landing/engine.tsx`: client component, playback.
- `src/components/landing/engine-timeline.ts`: timeline and layouts.
- Other sections stay server-rendered in `src/components/landing/sections.tsx`.

Use `prefers-reduced-motion` and the 900px breakpoint through `matchMedia` in the Engine. The clock caps each frame's delta at 50ms and pauses while the board is off screen or the tab is hidden.
