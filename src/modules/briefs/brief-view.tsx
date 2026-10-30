"use client";
import { useState } from "react";
import type { SavedBrief, StoredBrief } from "./repository";
import { Button } from "@/components/ui/button";
import { AnswerMarkdown } from "./answer-markdown";
import { EvidenceSources, InlineEvidence } from "./evidence-view";
import { Textarea } from "@/components/ui/textarea";
export function BriefView({ brief, evidencePrefix = brief.id }: { brief: StoredBrief; evidencePrefix?: string }) {
 if ("version" in brief.generated) return <TextAnswerView brief={brief} evidencePrefix={evidencePrefix}/>;
 return <LegacyBriefView brief={{ ...brief, generated: brief.generated }} evidencePrefix={evidencePrefix}/>;
}
function TextAnswerView({ brief }: { brief: StoredBrief; evidencePrefix: string }) {
 if (!("version" in brief.generated)) return null;
 const answer = brief.generated;
 return <div><AnswerMarkdown answer={answer} evidence={brief.evidence}/><EvidenceSources evidence={brief.evidence}/></div>;
}

function LegacyBriefView({ brief }: { brief: SavedBrief; evidencePrefix: string }) {
 const [text,setText]=useState(brief.edited_text??"");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const sections=[{key:"reusableApproach",label:"Reusable approach"},{key:"adjustments",label:"Adjustments"},{key:"conflicts",label:"Risks and conflicts"},{key:"nextSteps",label:"Next steps"}] as const;
 async function save(){setBusy(true);try{const result=await fetch(`/api/briefs/${brief.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,saved:true})});setMessage(result.ok?"Saved as your edit. The generated brief remains unchanged.":"Could not save.");}catch{setMessage("Connection unavailable.");}finally{setBusy(false);}}
 return <div><article><p className="rounded border p-4 text-sm">Generated recommendation. Historical claims have checked source references; semantic support still needs your judgment. This brief is not an observed case outcome.</p><section className="my-7"><h2 className="font-semibold">Hard constraints</h2>{brief.hard_constraints.length?brief.hard_constraints.map((constraint,index)=><p key={index} className="mt-2">{constraint.kind}: {constraint.text}</p>):<p className="mt-2 text-muted-foreground">None provided.</p>}</section>{sections.map((section)=><section key={section.key} className="my-8"><h2 className="text-xl font-semibold">{section.label}</h2>{brief.generated[section.key].length===0?<p className="mt-3 text-muted-foreground">None identified.</p>:brief.generated[section.key].map((claim,index)=><div key={index} className="mt-4"><span className="text-xs text-muted-foreground">{claim.kind}</span><p className="mt-1 whitespace-pre-wrap leading-7">{claim.text}</p><div className="mt-2 flex flex-wrap gap-3">{claim.references.map((ref) => { const index = brief.evidence.findIndex((item) => item.evidenceId === ref.evidenceId); const item = brief.evidence[index]; return item ? <InlineEvidence key={ref.evidenceId} item={item} number={index + 1}/> : <span key={ref.evidenceId}>Source unavailable</span>; })}</div></div>)}</section>)}<section className="my-8"><h2 className="text-xl font-semibold">Unknowns</h2>{brief.generated.unknowns.map((unknown,index)=><p key={index} className="mt-3">{unknown}</p>)}</section><section className="my-8 border-t pt-7"><h2 className="text-xl font-semibold">Your edited version</h2><p className="my-3 text-sm text-muted-foreground">User edits are saved separately and do not inherit the generated brief&apos;s provenance validation.</p><Textarea aria-label="Your edited version" value={text} onChange={(event)=>setText(event.target.value)} maxLength={20000} rows={8}/><Button className="mt-4" onClick={save} disabled={busy}>Save edited brief</Button><p role="status" className="mt-3">{message}</p></section></article><EvidenceSources evidence={brief.evidence}/></div>;
}
