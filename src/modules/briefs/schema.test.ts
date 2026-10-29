import { asSchema } from "ai";
import { expect, it } from "vitest";
import { claimSchema, draftBriefSchema } from "./schema";

it("serializes disjoint claim kinds with anyOf while preserving observed evidence requirements", async () => {
  const serialized = JSON.stringify(await asSchema(draftBriefSchema).jsonSchema);
  expect(serialized).toContain('"anyOf"');
  expect(serialized).not.toContain('"oneOf"');
  expect(claimSchema.safeParse({ kind: "observed", text: "Unsupported fact", references: [] }).success).toBe(false);
  expect(claimSchema.safeParse({ kind: "proposal", text: "Review applicability", references: [] }).success).toBe(true);
});
