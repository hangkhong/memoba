import { expect,it } from "vitest";
import { challengeCases,localCases } from "./local-v0/corpus";
import { caseInputSchema } from "@/modules/cases/schema";
it("keeps the challenge corpus balanced and every authored input inside the domain contracts",()=>{
 expect(localCases).toHaveLength(6);expect(challengeCases).toHaveLength(24);expect(challengeCases.filter((item)=>item.input.template==="product_delivery")).toHaveLength(12);expect(challengeCases.filter((item)=>item.input.template==="cs_operations")).toHaveLength(12);expect(new Set(challengeCases.map((item)=>item.slug)).size).toBe(24);
 for(const item of challengeCases)expect(caseInputSchema.safeParse(item.input).success,item.slug).toBe(true);
});
