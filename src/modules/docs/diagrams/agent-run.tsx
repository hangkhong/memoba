import { Repeat } from "lucide-react";
import { DiagramFrame, eyebrow } from "./parts";

type Row = { n: number; name: string; model: string | null; app: string };

const admit: Row = { n: 1, name: "Admission", model: null, app: "Checks who you are and which workspace is yours. Starts one clock that search, reading, retries, and correction all share." };
const loop: readonly Row[] = [
  { n: 2, name: "Search", model: "Picks what to search for, and searches again in new words if the results look thin or one-sided.", app: "Searches only active, published sources in your workspace. Hands back previews, which can't be cited." },
  { n: 3, name: "Read", model: "Chooses which cases and documents to open.", app: "Opens each at one pinned version, outcome first. Counts what was read and issues a citation marker for each section." },
];
const after: readonly Row[] = [
  { n: 4, name: "Stop", model: null, app: "Checks the clock and the counters before every step. Near a limit it takes the tools away, so the next step has to answer." },
  { n: 5, name: "Write", model: "Judges what is relevant and words the answer, with a marker beside each claim.", app: "Keeps time in reserve, so the agent can always finish." },
  { n: 6, name: "Validate", model: "Fixes the draft once, if a citation fails.", app: "Checks every marker and your access to it. One correction at most, inside the same deadline." },
  { n: 7, name: "Save", model: null, app: "Saves the answer, the cited text, and what was covered, together." },
];

// A step the model has no part in leaves its card out on a phone, where the two lanes stack; wide, the empty card keeps the lanes aligned.
function Cell({ lane, idle, children }: { lane: "model" | "app"; idle?: boolean; children: React.ReactNode }) {
  return <div className={(lane === "model" ? "rounded-lg border border-dashed border-primary/50 bg-background p-3" : "rounded-lg border border-primary/60 bg-background p-3") + (idle ? " hidden @xl:block" : "")}>
    <div className={eyebrow + " mb-1 @xl:hidden"}>{lane === "model" ? "The model decides" : "The application holds the rules"}</div>
    {children}
  </div>;
}

function Step({ row }: { row: Row }) {
  return <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-2"><span aria-hidden className="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{row.n}</span><span className="font-semibold">{row.name}</span></div>
    <div className="grid gap-2 @xl:grid-cols-2">
      <Cell lane="model" idle={row.model === null}>{row.model ?? <span className="text-muted-foreground">Not the model&apos;s call.</span>}</Cell>
      <Cell lane="app">{row.app}</Cell>
    </div>
  </div>;
}

// Takeaway: the model chooses what to look at; the application admits the question, sets the limits, and checks the result.
export function AgentRun() {
  return <DiagramFrame label="One run from question to saved answer in seven steps. For each step, what the model decides and what the application guarantees. The model works in search, read, write, and a correction. The application handles admission, the limits, validation, and saving.">
    <div className="flex flex-col gap-4">
      <div className="hidden gap-2 @xl:grid @xl:grid-cols-2"><div className={eyebrow}>The model decides</div><div className={eyebrow}>The application holds the rules</div></div>
      <Step row={admit}/>
      <div className="flex flex-col gap-4 -mx-[9px] rounded-xl border border-dashed border-primary/40 p-2 @md:-mx-[13px] @md:p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Repeat aria-hidden className="size-3.5"/>Repeats until the model has enough, or a limit says stop</div>
        {loop.map((row) => <Step key={row.n} row={row}/>)}
      </div>
      {after.map((row) => <Step key={row.n} row={row}/>)}
    </div>
  </DiagramFrame>;
}
