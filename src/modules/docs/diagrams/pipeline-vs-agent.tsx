import { ArrowDown } from "lucide-react";
import { DiagramFrame, Legend, Mark, eyebrow, type Kind } from "./parts";

const pile: readonly Kind[] = ["case", "doc", "case", "case", "doc", "case", "case", "case", "doc", "case", "case", "doc", "case", "case", "case", "doc", "case", "case", "case", "case"];
const opened: readonly Kind[] = ["case", "case", "doc"];

type Step = { title: string; body: string };
const pipeline: readonly Step[] = [
  { title: "Search once", body: "Uses the words of the question, and never looks again." },
  { title: "Paste in the top results", body: "Every piece goes in, helpful or not." },
  { title: "Answer", body: "Can cite anything it was shown, even in passing." },
];
const agent: readonly Step[] = [
  { title: "Search, then search differently", body: "Looks at the results, then asks again, including for what went wrong." },
  { title: "Open only what looks right", body: "Previews are short. A few cases are opened in full." },
  { title: "Answer", body: "Cites only what it opened. The application checks each one." },
];

function Lane({ title, steps, holds, marks, big }: { title: string; steps: readonly Step[]; holds: string; marks: readonly Kind[]; big?: boolean }) {
  return <div className="flex min-w-0 flex-col rounded-lg border bg-background p-3">
    <div className="text-base font-semibold">{title}</div>
    <div className="mt-2 flex flex-col gap-2">
      {steps.map((step, index) => <div key={step.title} className="flex flex-col gap-2">
        {index > 0 && <ArrowDown aria-hidden className="size-4 text-muted-foreground"/>}
        <div><div className="font-medium">{step.title}</div><div className="text-muted-foreground">{step.body}</div></div>
        {index === 1 && <div className="rounded-md border border-dashed p-2">
          <div className={eyebrow}>What the model holds</div>
          <div className={"mt-2 flex flex-wrap " + (big ? "gap-2" : "gap-1")}>{marks.map((kind, i) => <Mark key={i} kind={kind} className={big ? "size-5" : "size-3"}/>)}</div>
          <div className="mt-2 text-xs text-muted-foreground">{holds}</div>
        </div>}
      </div>)}
    </div>
  </div>;
}

// Takeaway: a pipeline fills the model before it thinks; the agent holds only what it opened.
export function PipelineVsAgent() {
  return <DiagramFrame label="Two ways to answer from past work, side by side. A plain pipeline searches once, pastes every result into the model, and can cite anything it was shown. Memoba's agent searches and searches again, opens only what looks right, and cites only what it opened." note="Illustrative: the number of marks is not a measurement.">
    <div className="grid gap-3 @xl:grid-cols-2">
      <Lane title="A plain pipeline" steps={pipeline} holds="Everything retrieved, useful or not" marks={pile}/>
      <Lane title="Memoba's agent" steps={agent} holds="Only what it opened and read" marks={opened} big/>
    </div>
    <div className="mt-3"><Legend/></div>
  </DiagramFrame>;
}
