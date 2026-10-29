import { expect, it } from "vitest";
import { textRunInputSchema } from "../analysis/schema.ts";
import { inputLimits } from "../../lib/contracts/limits.ts";
import { historyForConversation } from "./service.ts";
import { conversationDetailSchema } from "./view-schema.ts";
const request = { template: "product_delivery", version: 1, objective: "Release safely", context: "Small team", hardConstraints: [{ kind: "prohibition", text: "No downtime" }], conceptIds: [], unknowns: "" } satisfies import("../analysis/schema.ts").NormalizedRequest;
it("keeps user restrictions and prior text answers in a bounded run snapshot", () => {
  const turn = { id: crypto.randomUUID(), conversation_id: crypto.randomUUID(), position: 1, parent_turn_id: null, message: "How should we release?", request, created_at: "2026-01-01T00:00:00Z", runs: [] };
  const history = historyForConversation([turn]);
  expect(history[0]?.text).toContain('"text":"No downtime"');
  expect(textRunInputSchema.safeParse({ version: 2, message: "What changes?", history: Array.from({ length: inputLimits.conversationMessages + 1 }, () => ({ role: "user", text: "Keep this constraint" })) }).success).toBe(false);
});

it("includes a legacy brief as assistant context without treating it as case evidence", () => {
  const id = crypto.randomUUID();
  const at = "2026-01-01T00:00:00Z";
  const claim = { kind: "proposal", text: "Use a pilot", references: [] };
  const detail = conversationDetailSchema.parse({
    conversation: { id, author_id: crypto.randomUUID(), title: "Release", created_at: at, updated_at: at },
    turns: [{ id: crypto.randomUUID(), conversation_id: id, position: 1, parent_turn_id: null, message: "How should we release?", request, created_at: at, runs: [{
      id: crypto.randomUUID(), request, status: "complete", events: [], created_at: at, deadline_at: at, finished_at: at, error_code: null, usage: null, briefId: crypto.randomUUID(),
      brief: { id: crypto.randomUUID(), run_id: crypto.randomUUID(), generated: { reusableApproach: [claim], adjustments: [], conflicts: [], unknowns: ["Team size"], nextSteps: [claim] }, evidence: [], hard_constraints: [], edited_text: null, edited_at: null, saved: false, created_at: at },
    }] }],
  });
  const history = historyForConversation(detail.turns);
  expect(history[1]).toEqual({ role: "assistant", text: "reusableApproach (proposal): Use a pilot\nnextSteps (proposal): Use a pilot\nunknown: Team size" });
});
