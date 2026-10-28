import { expect,it } from "vitest";
import { challengeCases,localCases } from "./local-v0/corpus";
import { evaluationRequests } from "./challenge/requests";
import { caseInputSchema } from "@/modules/cases/schema";
import { requestSchema } from "@/modules/analysis/schema";
it("keeps the challenge corpus balanced and every authored input inside the domain contracts",()=>{
 expect(localCases).toHaveLength(6);expect(challengeCases).toHaveLength(24);expect(challengeCases.filter((item)=>item.input.template==="product_delivery")).toHaveLength(12);expect(challengeCases.filter((item)=>item.input.template==="cs_operations")).toHaveLength(12);expect(new Set(challengeCases.map((item)=>item.slug)).size).toBe(24);
 for(const item of challengeCases)expect(caseInputSchema.safeParse(item.input).success,item.slug).toBe(true);
});
it("defines twelve requests with explicit facets and only real expected source slugs",()=>{
 expect(evaluationRequests).toHaveLength(12);const slugs=new Set(challengeCases.map((item)=>item.slug));for(const item of evaluationRequests){expect(requestSchema.safeParse(item.request).success,item.id).toBe(true);expect(item.requiredFacets.length).toBeGreaterThan(0);expect(item.forbiddenConclusions.length).toBeGreaterThan(0);for(const slug of item.expectedSources)expect(slugs.has(slug),slug).toBe(true);}
 expect(evaluationRequests.find((item)=>item.id==="no-precedent")?.expectedSources).toEqual([]);
});
