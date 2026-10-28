"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { runSchema } from "./repository";
import { z } from "zod";
const savedRunSchema = runSchema.extend({ briefId: z.uuid().nullable() });
export function RunView({ initial }: { initial: z.infer<typeof savedRunSchema> }) {
  const [run,setRun]=useState(initial); const [error,setError]=useState("");
  useEffect(()=>{ if(run.status!=="running") return; const timer=setInterval(async()=>{ try { const response=await fetch(`/api/analyses/${run.id}`,{cache:"no-store"}); if(!response.ok){setError("Run unavailable. Access may have changed.");clearInterval(timer);return;} setRun(savedRunSchema.parse(await response.json())); }catch{setError("Cannot refresh run.");} },1500); return()=>clearInterval(timer); },[run.id,run.status]);
  return <><p role="status" className="my-6 text-lg">{run.status.replaceAll("_"," ")}</p>{run.status==="running" && <p>Refresh reads the saved state. Interrupted generation does not automatically resume.</p>}{run.status==="gap_report" && <section className="my-6 rounded border p-5"><h2 className="font-semibold">No precedent found</h2><p className="mt-3">The search completed successfully without usable evidence. Add cases covering the method, applicability conditions, and failures or exceptions for this request.</p></section>}{run.error_code && <p className="my-4">{run.error_code}. You can prepare a new request after checking the knowledge and model services.</p>}{run.briefId && <Link className="my-6 inline-block rounded bg-primary px-4 py-2 text-primary-foreground" href={`/workspace/briefs/${run.briefId}`}>Open Reuse Brief</Link>}<h2 className="my-4 font-semibold">Activity</h2><ol className="space-y-3">{run.events.map((event,index)=><li key={index} className="rounded border p-3">{event.stage}{event.tool && ` · ${event.tool}`} · {event.state}{event.count!==undefined && ` · ${event.count} items`}<time className="ml-3 text-xs text-muted-foreground">{event.at}</time></li>)}</ol>{run.usage && <p className="my-6 text-sm text-muted-foreground">Tokens: {run.usage.totalTokens??"not reported"}</p>}{error && <p role="alert">{error}</p>}</>;
}
