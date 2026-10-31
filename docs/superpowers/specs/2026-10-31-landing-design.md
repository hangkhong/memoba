# Landing page design

The prototype is [`docs/superpowers/prototypes/landing.html`](../prototypes/landing.html). Treat its copy as final and its CSS as a reference. It replaces the page in `src/app/page.tsx`.

## Idea

Cases are circles and documents are squares. This is the product's separation of what happened from what is required, turned into the page's one motif: citation chips, the Two memories fields, the Engine lanes, and the wordmark all use it. Teal `--chart-1` (`#1b6c80`) marks cases, and primary `#20282c` marks documents. Red appears only for a failed source. The page uses the workspace tokens and Manrope, so it reads as the same product at a larger scale.

## Sections and final copy

Take every string from the prototype. The structure is:

| Section | Headline | Content |
|---|---|---|
| Header | none | Wordmark, three anchor links, "Open the demo". Links hide below 820px. The button never hides |
| Hero | Your team already solved this. Nobody remembers where. | Lede, button, answer specimen with clickable citations and a source panel |
| Problem | The ticket survives. The reasoning doesn't. | A "Done" ticket beside the four things it lost, all from the recurring invoices case |
| Two memories | Cases say what happened. / Documents say what is required. | Two full-bleed fields, stacked on phones |
| Engine | Follow one question through the engine. | Interactive diagram below |
| Honesty | When they differ, you get both sides. | Difference specimen and three rules |
| Close | Ask the demo workspace a real question. | States that Northwind Ledger is fictional. Button, full-width wordmark |

## Sources for the specimen

The question comes from the `process-plus-case` scenario in `evals/text/scenarios.json`. Titles, numbers, and the release procedure version come from `evals/demo/product-cases.ts` and `evals/demo/process/release.ts`. The answer text is composed from that seed, not copied from a saved run. The `4 found` count is illustrative. The [evaluation record](../../reference/evaluation.md) says this scenario cited four cases.

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

Timing: 2.2s hold on a node, 0.85s along an edge, 1.6s along the dashed trace. The note, the progress bar, and the answer panel change on arrival, in one render, so they cannot drift from the token.

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
| Pictures | Product fragments only | Stock images would claim a world the demo does not have |

## Signed-in redirect

`src/proxy.ts` does not cover `/`, so make `src/app/page.tsx` an async server component. Call `createServerSupabase()`, then `auth.getUser()`, and `redirect("/workspace/chat")` when a user exists. On no user or an auth error, render the landing page. Do not use `requireWorkspace`, which throws for visitors. Remove `readAIConfig` and the old badge from this page. The page becomes dynamic, which is acceptable here.

## Components

- `src/app/page.tsx`: redirect, composition.
- `src/components/landing/site-header.tsx`: sticky bar.
- `src/components/landing/answer-specimen.tsx`: client component, citation state.
- `src/components/landing/engine.tsx`: client component, playback.
- `src/components/landing/engine-timeline.ts`: timeline and layouts.
- Other sections stay server-rendered in `src/components/landing/sections.tsx`.

Use `prefers-reduced-motion` and the 820px breakpoint through `matchMedia` in the Engine. Keep the frame-independent fallback in `animate`, so a dropped animation frame cannot stall the timeline.
