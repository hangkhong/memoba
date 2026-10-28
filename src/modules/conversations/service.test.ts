import { describe, expect, it } from "vitest";
import { requestSchema } from "../analysis/schema.ts";
import { inputLimits } from "../../lib/contracts/limits.ts";
import { requestForTurn } from "./service.ts";
const request = { template: "product_delivery", version: 1, objective: "Release safely", context: "Small team", hardConstraints: [{ kind: "prohibition", text: "No downtime" }], conceptIds: [], unknowns: "" } satisfies import("../analysis/schema.ts").NormalizedRequest;
describe("conversation request snapshots", () => {
  it("uses the first question as objective", () => {
    expect(requestForTurn({ key: crypto.randomUUID(), parentTurnId: null, message: "How can we release?", request }).objective).toBe("How can we release?");
  });
  it("retains the objective and explicit constraints while adding user context", () => {
    const next = requestForTurn({ key: crypto.randomUUID(), parentTurnId: crypto.randomUUID(), message: "Only one operator is available", request });
    expect(next.objective).toBe(request.objective);
    expect(next.hardConstraints).toEqual(request.hardConstraints);
    expect(next.context).toContain("Small team\n\nFollow-up from user: Only one operator is available");
    expect(request.context).toBe("Small team");
  });
  it("requires an explicit shorter context rather than truncating accumulated input", () => {
    const next = requestForTurn({ key: crypto.randomUUID(), parentTurnId: crypto.randomUUID(), message: "More context", request: { ...request, context: "x".repeat(inputLimits.text) } });
    expect(requestSchema.safeParse(next).success).toBe(false);
  });
});
