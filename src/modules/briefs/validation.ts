import { isDocumentEvidence, type DisclosedSource, type EvidenceItem } from "@/modules/knowledge/contracts";
import { textAnswerSchema } from "./schema";

// Cases say what happened and documents say what is required, so each heading may cite only its own kind.
// English headings are recognised by name. In any other language the heading ends with {#process} or {#cases}; the tag is checked here and removed before the answer is saved.
export const processHeading = "What the process says";
export const casesHeading = "How similar cases went";
const sectionTag = /\s*\{#(process|cases)\}\s*$/;
const headingKind = (heading: string) => {
  const tagged = sectionTag.exec(heading)?.[1];
  if (tagged) return tagged === "process" ? "document" : "case";
  const name = heading.trim().replace(/[:.]$/, "").toLocaleLowerCase();
  return name === processHeading.toLocaleLowerCase() ? "document" : name === casesHeading.toLocaleLowerCase() ? "case" : undefined;
};
export const stripSectionTags = (text: string) => text.split("\n").map((line) => /^#{1,6}\s/.test(line) ? line.replace(sectionTag, "") : line).join("\n");
export function citationPlacement(text: string, sources: ReadonlyMap<string, EvidenceItem>) {
  // A section keeps its kind through deeper subheadings and ends at the next heading of the same or a higher level.
  let expected: { kind: "document" | "case"; level: number } | undefined;
  for (const line of text.split("\n")) {
    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (heading?.[1] && heading[2]) {
      const kind = headingKind(heading[2]);
      if (kind) expected = { kind, level: heading[1].length };
      else if (expected && heading[1].length <= expected.level) expected = undefined;
      continue;
    }
    if (!expected) continue;
    for (const marker of line.match(/\[S:[^\]\n]*\]/g) ?? []) { const evidence = sources.get(marker); if (evidence && isDocumentEvidence(evidence) !== (expected.kind === "document")) return false; }
  }
  return true;
}

// A marker is valid when this run disclosed it or the conversation held it. Access is checked again for every one.
export async function validateTextAnswer({ text: tagged, disclosed, held = [], canRead }: {
  text: string;
  disclosed: DisclosedSource[];
  held?: DisclosedSource[];
  canRead: (item: EvidenceItem) => Promise<boolean>;
}) {
  const sources = new Map([...held, ...disclosed].map((source) => [source.marker, source.evidence]));
  const markerPattern = /\[S(?::|\d)[^\]\n]*\]/g;
  const found = [...new Set(tagged.match(markerPattern) ?? [])];
  // Anything that still looks like a marker after the real ones are removed is a malformed citation, not prose.
  const rest = tagged.replace(markerPattern, "");
  if (/\[S(?::|\d)/.test(rest) || /S:[0-9a-f]{8}-[0-9a-f]{4}-/i.test(rest)) return { kind: "invalid", code: "INVALID_CITATION" } as const;
  for (const marker of found) {
    const evidence = sources.get(marker);
    if (!evidence) return { kind: "invalid", code: "INVALID_CITATION" } as const;
    try {
      if (!await canRead(evidence)) return { kind: "invalid", code: "SOURCE_ACCESS_DENIED" } as const;
    } catch { return { kind: "invalid", code: "SOURCE_ACCESS_UNAVAILABLE" } as const; }
  }
  // One source can have two markers: the conversation holds the one an earlier answer used, and a fresh read issues another.
  // The saved answer keeps one marker per source, the one this run issued when there is one.
  const keep = new Map<string, string>();
  for (const source of disclosed) if (!keep.has(source.evidence.evidenceId)) keep.set(source.evidence.evidenceId, source.marker);
  for (const marker of found) { const evidenceId = sources.get(marker)?.evidenceId; if (evidenceId && !keep.has(evidenceId)) keep.set(evidenceId, marker); }
  const unified = found.reduce((current, marker) => { const target = keep.get(sources.get(marker)?.evidenceId ?? ""); return target && target !== marker ? current.replaceAll(marker, target) : current; }, tagged);
  const text = stripSectionTags(unified);
  const citations: { marker: string; evidenceId: string }[] = [];
  const snapshots: EvidenceItem[] = [];
  for (const marker of new Set(unified.match(markerPattern) ?? [])) {
    const evidence = sources.get(marker);
    if (!evidence) return { kind: "invalid", code: "INVALID_CITATION" } as const;
    citations.push({ marker, evidenceId: evidence.evidenceId });
    snapshots.push(evidence);
  }
  if (!citationPlacement(unified, sources)) return { kind: "invalid", code: "MISPLACED_CITATION" } as const;
  const answer = textAnswerSchema.safeParse({ version: 2, text, citations });
  if (!answer.success) return { kind: "invalid", code: "INVALID_SCHEMA" } as const;
  return { kind: "valid", value: answer.data, snapshots } as const;
}
