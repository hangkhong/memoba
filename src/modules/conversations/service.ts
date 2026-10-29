import type { ConversationDetail } from "./view-schema";
export function historyForConversation(turns: ConversationDetail["turns"]) {
  return turns.flatMap((turn) => {
    const previous = turn.request.version === 1
      ? `${turn.message}\nSaved request: ${JSON.stringify(turn.request)}`
      : turn.message;
    const answer = turn.runs.filter((run) => run.status === "complete" && run.brief).at(-1)?.brief?.generated;
    const text = !answer ? undefined : "version" in answer ? answer.text : [
      ...(["reusableApproach", "adjustments", "conflicts", "nextSteps"] as const).flatMap((section) => answer[section].map((claim) => `${section} (${claim.kind}): ${claim.text}`)),
      ...answer.unknowns.map((item) => `unknown: ${item}`),
    ].join("\n");
    return [{ role: "user" as const, text: previous }, ...(text ? [{ role: "assistant" as const, text }] : [])];
  });
}
