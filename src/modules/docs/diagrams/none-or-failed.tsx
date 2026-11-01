import { X } from "lucide-react";
import { DiagramFrame, Mark, eyebrow } from "./parts";

function Card({ title, source, says }: { title: string; source: React.ReactNode; says: string }) {
  return <div className="flex min-w-0 flex-col gap-3 rounded-lg border bg-background p-3">
    <div className="font-semibold">{title}</div>
    <div><div className={eyebrow + " mb-1.5"}>Search result</div>{source}</div>
    <div><div className={eyebrow + " mb-1"}>The answer</div><div className="text-muted-foreground">{says}</div></div>
  </div>;
}

// Takeaway: "nothing matched" and "could not check" look alike from outside, but the answer words them differently and claims nothing for the second.
export function NoneOrFailed() {
  return <DiagramFrame label="Three outcomes of searching the cases, shown for cases. Found: three cases were found and the answer compares how they went. None: the search ran and nothing matched, and the answer says no recorded case matched. Failed: the search broke, and the answer says it could not check cases and claims nothing about them." note="Shown for cases. Documents report their own state in the same way.">
    <div className="grid gap-3 @xl:grid-cols-3">
      <Card title="Found" source={<div className="flex items-center gap-2"><span className="flex gap-1"><Mark kind="case" className="size-5"/><Mark kind="case" className="size-5"/><Mark kind="case" className="size-5"/></span>3 cases</div>} says="Compares how they went, citing what it read."/>
      <Card title="None" source={<div className="flex items-center gap-2"><Mark kind="case" state="ghost" className="size-5"/>The search ran. Nothing matched.</div>} says="Says no recorded case matched, and builds next steps from the process."/>
      <Card title="Failed" source={<div className="flex items-center gap-2"><span className="relative grid size-5 place-items-center"><Mark kind="case" state="failed" className="size-5"/><X aria-hidden className="absolute size-3 text-destructive"/></span><span className="text-destructive">The search could not run.</span></div>} says="Says it could not check cases, and claims nothing about what they hold."/>
    </div>
  </DiagramFrame>;
}
