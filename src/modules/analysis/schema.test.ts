import { expect, it } from "vitest";
import { requestSchema, storedRunInputSchema } from "./schema";
import { inputLimits } from "../../lib/contracts/limits";
const request = { template: "product_delivery", version: 1, objective: "Reduce release failures", context: "Vietnamese and English knowledge", hardConstraints: [{ kind: "prohibition", text: "No downtime" }], conceptIds: [], unknowns: "Unknown adoption" };
it("rejects workspace selection and too many hard constraints at intake", () => {
  expect(requestSchema.safeParse({ ...request, workspaceId: "forged" }).success).toBe(false);
  expect(requestSchema.safeParse({ ...request, hardConstraints: Array.from({ length: 9 }, () => ({ kind: "requirement", text: "Must retain data" })) }).success).toBe(false);
});
it("reads legacy requests and bounded text input without fabricated fields", () => {
  expect(storedRunInputSchema.parse(request)).toEqual(request);
  const input = { version: 2, message: "What should we do?", history: [{ role: "user", text: "No downtime" }] };
  expect(storedRunInputSchema.parse(input)).toEqual(input);
  expect(storedRunInputSchema.safeParse({ ...input, history: Array.from({ length: inputLimits.conversationMessages + 1 }, () => input.history[0]) }).success).toBe(false);
  expect(storedRunInputSchema.safeParse({ ...input, workspaceId: crypto.randomUUID() }).success).toBe(false);
});
