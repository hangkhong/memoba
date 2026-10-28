import { planQueriesSchema, type NormalizedRequest, type RequestPlan } from "./schema";
import { inputLimits } from "@/lib/contracts/limits";

export function buildRequestPlan(request: NormalizedRequest): RequestPlan {
  const query = `${request.objective}\n${request.context}`.slice(0, inputLimits.text - 80);
  return {
    request,
    queries: [
      { purpose: "method", query },
      { purpose: "conditions", query: `${query}\nĐiều kiện áp dụng / applicability conditions` },
      { purpose: "exceptions", query: `${query}\nThất bại, ngoại lệ / failures and exceptions` },
    ],
  };
}

export function resolvePlannerResult({ request, output }: { request: NormalizedRequest; output: unknown }) {
  const parsed = planQueriesSchema.safeParse(output);
  if (!parsed.success) return { source: "deterministic", plan: buildRequestPlan(request) } as const;
  return { source: "planner", plan: { request, queries: parsed.data.queries } } as const;
}
