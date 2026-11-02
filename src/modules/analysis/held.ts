import { executionLimits } from "@/lib/contracts/limits";
import { isDocumentEvidence, type DisclosedSource, type HeldSource } from "@/modules/knowledge/contracts";

// A changed source is not citable until it is read again; an archived one stays a valid historical citation.
export const citableHeld = (held: HeldSource[]): DisclosedSource[] => held.filter((source) => source.standing !== "changed").map(({ marker, evidence }) => ({ marker, evidence }));

function describe({ marker, evidence, standing }: HeldSource) {
  const excerpt = evidence.excerpt.slice(0, executionLimits.ledgerExcerptChars);
  return isDocumentEvidence(evidence)
    ? { marker, kind: "document", standing, title: evidence.documentTitle, documentId: evidence.documentId, version: evidence.version, effectiveFrom: evidence.effectiveFrom, heading: evidence.heading, revisionId: evidence.revisionId, excerpt, truncated: excerpt.length < evidence.excerpt.length }
    : { marker, kind: "case", standing, title: evidence.caseTitle, caseId: evidence.caseId, section: evidence.sectionKey, outcome: evidence.outcome, revisionId: evidence.revisionId, excerpt, truncated: excerpt.length < evidence.excerpt.length };
}

// The held evidence the agent sees before it answers. The notice about changed sources comes from code, not from the model.
export function heldEvidenceBlock(held: HeldSource[]): string | undefined {
  if (!held.length) return undefined;
  const changed = held.filter((source) => source.standing === "changed");
  const archived = held.some((source) => source.standing === "archived");
  const notes = [
    ...(changed.length ? [`CHANGED: ${[...new Set(changed.map((source) => describe(source).title))].join("; ")} has a newer version or could not be checked. Its markers (${changed.map((source) => source.marker).join(" ")}) cannot be cited. Read it again with read_case or read_document before you rely on it.`] : []),
    ...(archived ? ["ARCHIVED sources are historical: cite them only to restate what an earlier answer said, and do not treat them as new evidence."] : []),
  ];
  return `<held_evidence>\nSources that earlier answers in this conversation cited. Markers with standing "current" or "archived" can be cited exactly as written. Excerpts are shortened.\n${notes.length ? `${notes.join("\n")}\n` : ""}${JSON.stringify(held.map(describe))}\n</held_evidence>`;
}
