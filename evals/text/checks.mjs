import { z } from "zod";

// Deterministic assertions over one observed turn. They never judge whether an answer is good;
// they check what the run did (tool calls, markers, language), which is observable without a model.
export const checkSchema = z.object({
  turn: z.number().int().positive(),
  tools: z.enum(["none", "some"]).optional(),
  keepsCitations: z.boolean().optional(),
  language: z.enum(["vi", "en"]).optional(),
  onlyMissing: z.boolean().optional(),
  rereadsFixture: z.boolean().optional(),
  answerIncludes: z.array(z.string().min(1)).optional(),
}).strict();

const markerPattern = /\[S:[0-9a-f-]{36}:[0-9]+\]/g;
const vietnamese = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
// The five template headings; an answer in another language must not fall back to them.
const englishHeadings = /^#{1,6}\s*(what the process says|how similar cases went|where practice and process differ|what's different this time|suggested next step)\b/im;

export function headingsOf(text) { return text.split("\n").filter((line) => /^#{1,6}\s+\S/.test(line)); }

export function readsOf(turn) {
  return turn.toolCalls.filter((call) => call.name === "read_case" || call.name === "read_document");
}
function idsOf(call) {
  const input = call.input ?? {};
  return [...(Array.isArray(input.caseIds) ? input.caseIds : []), ...(typeof input.documentId === "string" ? [input.documentId] : [])];
}
// Case and document IDs that earlier answers cited, from the saved source identity.
export function heldIds(turns) {
  return new Set(turns.flatMap((turn) => (turn.citedSources ?? []).flatMap((cited) => [cited.source?.caseId, cited.source?.documentId].filter(Boolean))));
}

/**
 * inputs=false marks a stream without tool inputs (--live), where input checks cannot be observed.
 * @param {any} turn
 * @param {any} check
 * @param {{ priorTurns?: any[], fixtureCaseId?: string | null, inputs?: boolean }} [options]
 */
export function evaluateTurn(turn, check, { priorTurns = [], fixtureCaseId = null, inputs = true } = {}) {
  const failures = [];
  const text = turn.answer ?? "";
  if (turn.termination.status !== "complete") failures.push(`run ended ${turn.termination.status}${turn.termination.code ? ` (${turn.termination.code})` : ""}`);
  if (check.tools === "none" && turn.toolCalls.length > 0) failures.push(`expected 0 tool calls, saw ${turn.toolCalls.length}: ${turn.toolCalls.map((call) => call.name).join(", ")}`);
  if (check.tools === "some" && turn.toolCalls.length === 0) failures.push("expected tool calls, saw none");
  if (check.keepsCitations && !(text.match(markerPattern) ?? []).length) failures.push("answer has no citation markers");
  if (check.language === "vi") {
    if (!vietnamese.test(text)) failures.push("answer is not Vietnamese");
    const headings = headingsOf(text);
    if (englishHeadings.test(text)) failures.push("answer kept English template headings");
    if (headings.length && !headings.some((heading) => vietnamese.test(heading))) failures.push("no heading is Vietnamese");
  }
  if (check.language === "en" && vietnamese.test(text)) failures.push("answer is not English");
  for (const needle of check.answerIncludes ?? []) if (!text.toLowerCase().includes(needle.toLowerCase())) failures.push(`answer does not mention "${needle}"`);
  if (check.onlyMissing || check.rereadsFixture) {
    if (!inputs) failures.push("tool inputs are not observable in this mode");
    else {
      const held = heldIds(priorTurns);
      const read = readsOf(turn).flatMap(idsOf);
      if (check.onlyMissing) {
        if (!read.length) failures.push("read nothing new");
        const again = read.filter((id) => held.has(id));
        if (again.length) failures.push(`re-read held sources: ${[...new Set(again)].join(", ")}`);
      }
      if (check.rereadsFixture && !(fixtureCaseId && read.includes(fixtureCaseId))) failures.push("did not re-read the changed case");
    }
  }
  return { turn: check.turn, passed: failures.length === 0, failures };
}

/** @param {any} scenario @param {any[]} turns @param {{ fixtureCaseId?: string | null, inputs?: boolean }} [options] */
export function evaluateScenario(scenario, turns, options = {}) {
  return (scenario.checks ?? []).map((check) => {
    const turn = turns[check.turn - 1];
    if (!turn) return { turn: check.turn, passed: false, failures: ["turn did not run"] };
    return evaluateTurn(turn, check, { ...options, priorTurns: turns.slice(0, check.turn - 1) });
  });
}
