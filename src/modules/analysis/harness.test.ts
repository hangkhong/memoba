import { expect, it, vi } from "vitest";
import { runAnalysis } from "./harness";
import { createEvidenceRegistry } from "@/modules/knowledge/context";
import { requestSchema } from "./schema";
const request = requestSchema.parse({ template: "product_delivery", version: 1, objective: "Canary", context: "Team", hardConstraints: [{ kind: "prohibition", text: "No downtime" }], conceptIds: [], unknowns: "" });
function deps() {
  const finished: string[] = [];
  return { finished, registry: createEvidenceRegistry(), knowledge: { search: async () => ({ kind: "empty" as const, items: [] as [] }), read: async () => ({ kind: "empty" as const, items: [] as [] }), expand: async () => ({ kind: "empty" as const, items: [] as [] }) }, generate: async () => { throw Error("must not call model"); }, repair: async () => { throw Error("must not repair"); }, canRead: async () => true, emit: async () => {}, finish: async (status: string) => { finished.push(status); return null; } };
}
it("successful empty retrieval returns a gap report and releases the run", async () => { const d = deps(); expect((await runAnalysis(request,d)).status).toBe("gap_report"); expect(d.finished).toEqual(["gap_report"]); });
it("a failed search is never converted into a gap report", async () => { const d=deps(); const result=await runAnalysis(request,{...d,knowledge:{...d.knowledge,search:async()=>({kind:"error",code:"QUERY_FAILED",retryable:false})}}); expect(result.status).toBe("failed"); expect(d.finished).toEqual(["failed"]); });
it("retries a transient search once", async () => { const d=deps(); let count=0; const result=await runAnalysis(request,{...d,knowledge:{...d.knowledge,search:async()=>{count++; return count===1 ? {kind:"error",code:"QUERY_FAILED",retryable:true} : {kind:"empty",items:[]};}}}); expect(result.status).toBe("gap_report"); expect(count).toBe(4); });
it("a hanging retrieval times out and persists a terminal result", async () => { vi.useFakeTimers(); const d=deps(); const pending=runAnalysis(request,{...d,knowledge:{...d.knowledge,search:()=>new Promise(()=>{})}}); await vi.advanceTimersByTimeAsync(90001); expect((await pending).status).toBe("timed_out"); expect(d.finished).toEqual(["timed_out"]); vi.useRealTimers(); });

it("repairs an invented citation once, then fails without saving an incomplete brief", async () => {
 const { evidenceSchema }=await import("@/modules/knowledge/contracts");const d=deps();const item=evidenceSchema.parse({evidenceId:"e1",caseId:crypto.randomUUID(),revisionId:crypto.randomUUID(),sectionId:crypto.randomUUID(),sectionKey:"approach",caseTitle:"Canary",excerpt:"Use a pilot",outcome:"achieved",authorId:crypto.randomUUID(),recordedAt:new Date().toISOString(),sources:[],purpose:"method",retrievalReason:"hybrid"});d.registry.register(item);
 const draft={reusableApproach:[{kind:"observed",text:"Historical claim",references:[{evidenceId:"invented",caseId:item.caseId,revisionId:item.revisionId,sectionKey:"approach"}]}],adjustments:[],conflicts:[],unknowns:[],nextSteps:[{kind:"proposal",text:"Pilot",references:[]}]};let repairs=0;const usage={inputTokens:1,outputTokens:1,totalTokens:2};
 const result=await runAnalysis(request,{...d,generate:async()=>({draft,usage}),repair:async()=>{repairs++;return {draft,usage};}});expect(result.status).toBe("failed");expect(result.code).toBe("INVALID_CITATION");expect(repairs).toBe(1);expect(d.finished).toEqual(["failed"]);
});

it("reports a provider rate limit and releases the run without exposing provider text",async()=>{
 const {ModelCallError}=await import("./errors");const {evidenceSchema}=await import("@/modules/knowledge/contracts");const d=deps();d.registry.register(evidenceSchema.parse({evidenceId:"e1",caseId:crypto.randomUUID(),revisionId:crypto.randomUUID(),sectionId:crypto.randomUUID(),sectionKey:"approach",caseTitle:"Pilot",excerpt:"Review pilot",outcome:"unknown",authorId:crypto.randomUUID(),recordedAt:new Date().toISOString(),sources:[],purpose:"method",retrievalReason:"test fixture"}));
 const result=await runAnalysis(request,{...d,generate:async()=>{throw new ModelCallError("MODEL_RATE_LIMITED");}});expect(result.code).toBe("MODEL_RATE_LIMITED");expect(JSON.stringify(result)).not.toContain("secret");expect(d.finished).toEqual(["failed"]);
});
