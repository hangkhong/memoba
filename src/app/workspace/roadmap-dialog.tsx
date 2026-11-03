"use client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const features = [
  {
    id: "connect",
    label: "Your AI",
    problem: "Most people already work inside ChatGPT or Claude. Their notes, decisions, and drafts live there, so recording a case in Memoba means copying the same work a second time.",
    context: "Today a case or document gets in only by hand, through a form or pasted notes. That extra step is where knowledge gets lost.",
    solution: "An MCP server lets the assistant you already use read Memoba and draft cases and documents into it. You review the draft and publish it. Nothing is saved without you.",
  },
  {
    id: "graph",
    label: "Knowledge graph",
    problem: "Search finds sections that look like your question. It misses the links between them: the case that a later case reversed, or the policy that a case broke.",
    context: "Memoba combines keyword search with search by meaning. That works for one question at a time. It struggles when the answer depends on how several cases connect.",
    solution: "A graph stores cases, documents, people, and outcomes as nodes, with typed links between them. The agent can follow those links to the precedent that matters, and every step stays cited.",
  },
  {
    id: "canvas",
    label: "Case canvas",
    problem: "New team members read past cases as finished stories. They see the outcome but never practise the decision.",
    context: "The cases already hold the situation, the options, and what happened. That is the material for an exercise.",
    solution: "A canvas turns a recorded case into a challenge. You see the situation, make your call, and then compare it with what the team decided and why.",
  },
] as const;

export function RoadmapDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex max-h-[min(92svh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[44rem]">
    <DialogHeader className="shrink-0 gap-1.5 border-b px-6 py-4 pr-14"><DialogTitle className="text-base">Roadmap</DialogTitle><DialogDescription>What Memoba builds next, and the problem each step solves.</DialogDescription></DialogHeader>
    <Tabs defaultValue={features[0].id} className="min-h-0 flex-1 gap-0">
      <div className="shrink-0 border-b px-4 py-3 sm:px-6"><TabsList className="w-full sm:w-fit">{features.map((feature) => <TabsTrigger key={feature.id} value={feature.id}>{feature.label}</TabsTrigger>)}</TabsList></div>
      {features.map((feature) => <TabsContent key={feature.id} value={feature.id} className="min-h-0 overflow-y-auto px-6 py-6"><dl className="space-y-5 text-sm leading-relaxed">
        {([["Problem", feature.problem], ["Context", feature.context], ["Solution", feature.solution]] as const).map(([term, text]) => <div key={term} className="space-y-1"><dt className="font-medium">{term}</dt><dd className="text-muted-foreground">{text}</dd></div>)}
      </dl></TabsContent>)}
    </Tabs>
  </DialogContent></Dialog>;
}
