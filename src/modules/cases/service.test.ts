import { expect, it } from "vitest";
import { createCaseService } from "./service";
import { caseInputSchema } from "./schema";

const input = caseInputSchema.parse({ template: "product_delivery", title: "Release", problem: "Risk", context: "Small team", constraints: "No downtime", approach: "Canary", outcome: "unknown", observedOutcome: "Not measured", lessons: "Monitor", sources: [], conceptIds: [], deliverable: "Feature", changeScope: "Checkout", deploymentConditions: "Rollback ready" });
it("preserves the saved revision when indexing fails and retries the same revision", async () => {
  const saved = { caseId: crypto.randomUUID(), revisionId: crypto.randomUUID(), indexState: "pending" as const };
  const indexed: string[] = [];
  let fail = true;
  const service = createCaseService({
    save: async () => saved,
    revision: async () => ({ ...saved, input, indexState: "pending" as const }),
    index: async (id) => { indexed.push(id); return { ...saved, indexState: "ready" as const }; },
    fail: async () => {},
  }, async () => fail ? { kind: "error", code: "EMBEDDING_UNAVAILABLE", retryable: true } : { kind: "success", vectors: Array.from({ length: 9 }, () => [1, 0]), tokens: null });
  expect(await service.save(input)).toEqual({ ...saved, indexState: "failed" });
  expect(indexed).toEqual([]);
  fail = false;
  expect((await service.reindex(saved.revisionId)).indexState).toBe("ready");
  expect(indexed).toEqual([saved.revisionId]);
});
it("does not reindex a ready revision", async () => {
  const saved = { caseId: crypto.randomUUID(), revisionId: crypto.randomUUID(), indexState: "ready" as const };
  const service = createCaseService({ save: async () => saved, revision: async () => ({ ...saved, input }), index: async () => { throw Error("must not run"); }, fail: async () => {} }, async () => { throw Error("must not run"); });
  expect(await service.reindex(saved.revisionId)).toEqual(saved);
});

it("saves content without a configured model and exposes failed indexing for retry", async () => {
  const saved={caseId:crypto.randomUUID(),revisionId:crypto.randomUUID(),indexState:"pending" as const};let failed=false;
  const service=createCaseService({save:async()=>saved,revision:async()=>({...saved,input}),index:async()=>{throw Error("must not publish");},fail:async()=>{failed=true;}});
  expect(await service.save(input)).toEqual({...saved,indexState:"failed"});expect(failed).toBe(true);
});
it("records publication failure without discarding the saved revision", async () => {
 const saved={caseId:crypto.randomUUID(),revisionId:crypto.randomUUID(),indexState:"pending" as const};let failed=false;
 const service=createCaseService({save:async()=>saved,revision:async()=>({...saved,input}),index:async()=>{throw Error("transaction failed");},fail:async()=>{failed=true;}},async()=>({kind:"success",vectors:Array.from({length:9},()=>[1,0]),tokens:null}));
 expect(await service.save(input)).toEqual({...saved,indexState:"failed"});expect(failed).toBe(true);
});
