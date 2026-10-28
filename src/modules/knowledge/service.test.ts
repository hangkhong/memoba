import { expect, it } from "vitest";
import { createKnowledgeService } from "./service";
import { createEvidenceRegistry } from "./context";
import { evidenceSchema } from "./contracts";
const item = evidenceSchema.parse({ evidenceId: "e1", caseId: crypto.randomUUID(), revisionId: crypto.randomUUID(), sectionId: crypto.randomUUID(), sectionKey: "approach", caseTitle: "Canary", excerpt: "Use a controlled release", outcome: "achieved", authorId: crypto.randomUUID(), recordedAt: new Date().toISOString(), sources: [], purpose: "method", retrievalReason: "hybrid" });
it("distinguishes successful empty retrieval from failed retrieval", async () => {
  const service = createKnowledgeService({ search: async () => ({ kind: "empty", items: [] }), read: async () => ({ kind: "error", code: "QUERY_FAILED", retryable: true }), expand: async () => ({ kind: "empty", items: [] }) }, createEvidenceRegistry());
  expect((await service.search({ query: "absent", purpose: "method", conceptIds: [] })).kind).toBe("empty");
  expect((await service.read({ caseId: item.caseId, sectionKeys: [] })).kind).toBe("error");
});
it("pins registered revisions and rejects replacements instead of silently changing evidence", async () => {
  const registry = createEvidenceRegistry(); registry.register(item);
  const changed = { ...item, evidenceId: "e2", revisionId: evidenceSchema.shape.revisionId.parse(crypto.randomUUID()) };
  const service = createKnowledgeService({ search: async () => ({ kind: "success", items: [changed] }), read: async () => ({ kind: "empty", items: [] }), expand: async () => ({ kind: "empty", items: [] }) }, registry);
  expect((await service.search({ query: "canary", purpose: "method", conceptIds: [] })).kind).toBe("empty");
  expect(registry.items()).toEqual([item]);
});
it("expands a root once and does not let tool calls traverse a second hop",async()=>{
 const registry=createEvidenceRegistry();registry.register(item);const neighbor=evidenceSchema.parse({...item,evidenceId:"neighbor",caseId:crypto.randomUUID(),revisionId:crypto.randomUUID(),sectionId:crypto.randomUUID()});let expansions=0;
 const service=createKnowledgeService({search:async()=>({kind:"empty",items:[]}),read:async()=>({kind:"empty",items:[]}),expand:async()=>{expansions++;return {kind:"success",items:[neighbor]};}},registry);
 expect((await service.expand({seedIds:[item.caseId],relationTypes:["related_to"]})).kind).toBe("success");
 expect((await service.expand({seedIds:[neighbor.caseId],relationTypes:["related_to"]})).kind).toBe("empty");
 expect((await service.expand({seedIds:[item.caseId],relationTypes:["related_to"]})).kind).toBe("empty");expect(expansions).toBe(1);
});
