import type { DisclosedSource, EvidenceItem } from "@/modules/knowledge/contracts";
import { textAnswerSchema } from "./schema";

export async function validateTextAnswer({ text, disclosed, canRead }: {
  text: string;
  disclosed: DisclosedSource[];
  canRead: (item: EvidenceItem) => Promise<boolean>;
}) {
  const sources = new Map(disclosed.map((source) => [source.marker, source.evidence]));
  const markerPattern = /\[S(?::|\d)[^\]\n]*\]/g;
  const markers = [...new Set(text.match(markerPattern) ?? [])];
  if (/\[S(?::|\d)/.test(text.replace(markerPattern, ""))) return { kind: "invalid", code: "INVALID_CITATION" } as const;
  const citations: { marker: string; evidenceId: string }[] = [];
  const snapshots: EvidenceItem[] = [];
  for (const marker of markers) {
    const evidence = sources.get(marker);
    if (!evidence) return { kind: "invalid", code: "INVALID_CITATION" } as const;
    try {
      if (!await canRead(evidence)) return { kind: "invalid", code: "SOURCE_ACCESS_DENIED" } as const;
    } catch { return { kind: "invalid", code: "SOURCE_ACCESS_UNAVAILABLE" } as const; }
    citations.push({ marker, evidenceId: evidence.evidenceId });
    snapshots.push(evidence);
  }
  const answer = textAnswerSchema.safeParse({ version: 2, text, citations });
  if (!answer.success) return { kind: "invalid", code: "INVALID_SCHEMA" } as const;
  return { kind: "valid", value: answer.data, snapshots } as const;
}
