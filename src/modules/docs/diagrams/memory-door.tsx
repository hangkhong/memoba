import { ArrowDown, ArrowRight, Ban } from "lucide-react";
import { DiagramFrame, Mark, eyebrow } from "./parts";

type Node = { title: string; sub: string; strong?: boolean; mark?: boolean };

function Box({ node }: { node: Node }) {
  return <div className={"min-w-0 flex-1 rounded-lg bg-background p-3 " + (node.strong ? "border-2 border-primary" : "border")}>
    <div className="flex items-center gap-2 font-semibold">{node.mark ? <Mark kind="case"/> : null}{node.title}</div>
    <div className="text-muted-foreground">{node.sub}</div>
  </div>;
}

function Flow({ title, nodes, end }: { title: string; nodes: readonly Node[]; end?: React.ReactNode }) {
  return <div className="flex flex-col gap-2">
    <div className={eyebrow}>{title}</div>
    <div className="flex flex-col items-stretch gap-2 @xl:flex-row @xl:items-center">
      {nodes.map((node, i) => <div key={node.title} className="contents">
        {i > 0 && <><ArrowRight aria-hidden className="hidden size-4 shrink-0 self-center text-muted-foreground @xl:block"/><ArrowDown aria-hidden className="size-4 self-center text-muted-foreground @xl:hidden"/></>}
        <Box node={node}/>
      </div>)}
      {end}
    </div>
  </div>;
}

// Takeaway: the only way into the team's memory is a person saving a case; neither Import nor a generated answer writes to it.
export function MemoryDoor() {
  return <DiagramFrame label="Two paths. Writing a case: pasted notes go to Import, which drafts the form with one model call and saves nothing; a person reviews the draft and saves it; only then is it one of the team's cases. Asking a question: the generated answer is advice, kept apart from outcomes, and is never saved as a case.">
    <div className="flex flex-col gap-5">
      <Flow title="Writing a case" nodes={[
        { title: "Pasted notes", sub: "What Import starts from" },
        { title: "Import drafts the form", sub: "One model call. Nothing is saved." },
        { title: "A person reviews and saves", sub: "The only way in", strong: true },
        { title: "The team's cases", sub: "What people recorded", mark: true },
      ]}/>
      <Flow title="Asking a question" nodes={[
        { title: "Your question", sub: "Asked in plain words" },
        { title: "A generated answer", sub: "Advice, kept apart from outcomes" },
      ]} end={<><Ban aria-hidden className="size-4 shrink-0 self-center text-muted-foreground"/><div className="min-w-0 flex-1 rounded-lg border border-dashed p-3 text-muted-foreground">Never saved as a case</div></>}/>
    </div>
  </DiagramFrame>;
}
