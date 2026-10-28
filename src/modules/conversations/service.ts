import type { NormalizedRequest } from "../analysis/schema.ts";
import type { TurnInput } from "./schema.ts";

// The submitted details are the user's explicit state, including constraint edits.
// Only user text is carried forward. Generated answers never enter case evidence.
export function requestForTurn(input: TurnInput): NormalizedRequest {
  return input.parentTurnId === null
    ? { ...input.request, objective: input.message }
    : { ...input.request, context: `${input.request.context}\n\nFollow-up from user: ${input.message}` };
}
