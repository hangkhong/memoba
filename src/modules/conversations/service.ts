import { inputLimits } from "@/lib/contracts/limits";
import type { ConversationMessage } from "@/modules/analysis/schema";
import type { ConversationDetail } from "./view-schema";

// History is bounded by dropping the oldest turns, never by refusing the next question.
// Answers go first, oldest first, because the sources they cited stay in the conversation's held evidence;
// the user's own messages carry the restrictions they stated, so those go only after every older answer is gone.
export function boundHistory(messages: ConversationMessage[]): ConversationMessage[] {
  const lastOf = (role: ConversationMessage["role"]) => messages.findLastIndex((message) => message.role === role);
  const order = [
    ...messages.flatMap((message, index) => message.role === "assistant" && index !== lastOf("assistant") ? [index] : []),
    ...messages.flatMap((message, index) => message.role === "user" && index !== lastOf("user") ? [index] : []),
    lastOf("assistant"), lastOf("user"),
  ].filter((index) => index >= 0);
  const dropped = new Set<number>();
  let count = messages.length; let chars = messages.reduce((sum, message) => sum + message.text.length, 0);
  for (const index of order) {
    if (count <= inputLimits.conversationMessages && chars <= inputLimits.historyChars) break;
    dropped.add(index); count -= 1; chars -= messages[index]?.text.length ?? 0;
  }
  return messages.filter((_, index) => !dropped.has(index));
}

const userMessages = (text: string): ConversationMessage[] => Array.from({ length: Math.ceil(text.length / inputLimits.text) }, (_, index) => ({ role: "user", text: text.slice(index * inputLimits.text, (index + 1) * inputLimits.text) }));

export function historyForConversation(turns: ConversationDetail["turns"]): ConversationMessage[] {
  return boundHistory(turns.flatMap((turn) => {
    const previous = turn.request.version === 1
      ? `${turn.message}\nSaved request: ${JSON.stringify(turn.request)}`
      : turn.message;
    const answer = turn.runs.filter((run) => run.status === "complete" && run.brief).at(-1)?.brief?.generated;
    const text = !answer ? undefined : "version" in answer ? answer.text : [
      ...(["reusableApproach", "adjustments", "conflicts", "nextSteps"] as const).flatMap((section) => answer[section].map((claim) => `${section} (${claim.kind}): ${claim.text}`)),
      ...answer.unknowns.map((item) => `unknown: ${item}`),
    ].join("\n");
    return [...userMessages(previous), ...(text ? [{ role: "assistant" as const, text: text.slice(0, inputLimits.historyAnswer) }] : [])];
  }));
}
