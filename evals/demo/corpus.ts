import type { FixtureCase } from "../local-v0/corpus";
import { operationsCases } from "./operations-cases.ts";
import { productCases } from "./product-cases.ts";

export { demoConcepts } from "./builders.ts";
export const demoCases: FixtureCase[] = [...productCases, ...operationsCases];
