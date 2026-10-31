import { documentPublishSchema, documentTypeSchema, type DocumentInput, type SavedDocument } from "./schema.ts";
import { sectionEmbeddingText, splitDocument } from "./split.ts";
import { documentTypeLabels } from "./presentation.ts";

export type PublishSection = { ordinal: number; kind: "summary" | "body"; block: number | null; heading: string; headingPath: string; text: string; embedding: number[] };
export type DocumentStore = {
  // The published revision of a document, or null when the document is unavailable.
  current: (documentId: string) => Promise<{ revisionId: string; version: number; content: DocumentInput; embeddingModel: string; dimensions: number } | null>;
  publish: (args: { documentId: string | null; content: DocumentInput; changeNote: string | null; sections: PublishSection[] }) => Promise<SavedDocument>;
};
type Embed = (args: { texts: string[]; signal: AbortSignal }) => Promise<{ kind: "success"; vectors: number[][]; tokens: number | null } | { kind: "error"; code: string; retryable: boolean }>;
export type DocumentSaveResult = { kind: "saved"; saved: SavedDocument } | { kind: "invalid"; errors: string[] } | { kind: "unavailable" };

// The summary is searchable but never disclosed: it carries what the document is for, not its text.
export function summaryText(input: DocumentInput) {
  return `${input.title}\n${input.description}\n${documentTypeLabels[documentTypeSchema.parse(input.type)]} · ${input.area} · Owner: ${input.owner} · Effective ${input.effectiveFrom}`;
}
export function normalizeBody(body: string) { return body.replace(/\r\n?/g, "\n"); }

export function createDocumentService(store: DocumentStore, embed: Embed, profile: { embeddingModel: string; dimensions: number }) {
  return {
    // Embeds first, then publishes in one transaction. Identical content returns the current revision without a model call.
    async save(raw: unknown, documentId: string | null = null): Promise<DocumentSaveResult> {
      const candidate = typeof raw === "object" && raw !== null && "body" in raw && typeof raw.body === "string" ? { ...raw, body: normalizeBody(raw.body) } : raw;
      const parsed = documentPublishSchema.safeParse(candidate);
      if (!parsed.success) return { kind: "invalid", errors: parsed.error.issues.map((issue) => issue.message) };
      const { changeNote, ...input } = parsed.data;
      if (documentId) {
        const current = await store.current(documentId);
        if (!current) return { kind: "unavailable" };
        // The RPC repeats this check under lock; here it only avoids paying for embeddings that cannot change anything.
        if (current.embeddingModel === profile.embeddingModel && current.dimensions === profile.dimensions && JSON.stringify(sortKeys(current.content)) === JSON.stringify(sortKeys(input))) return { kind: "saved", saved: { documentId, revisionId: current.revisionId, version: current.version, status: "unchanged" } };
        if (!changeNote) return { kind: "invalid", errors: ["Describe what changed and why."] };
      }
      const split = splitDocument(input.title, input.body);
      if (split.kind === "invalid") return { kind: "invalid", errors: split.errors.map((error) => error.message) };
      const body = split.blocks.flatMap((block) => block.sections.map((section) => ({ block, section })));
      const texts = [summaryText(input), ...body.map(({ section }) => sectionEmbeddingText(input.title, section))];
      const embedded = await embed({ texts, signal: AbortSignal.timeout(60_000) });
      if (embedded.kind === "error" || embedded.vectors.length !== texts.length) throw new Error("EMBEDDING_UNAVAILABLE");
      const sections: PublishSection[] = [
        { ordinal: 0, kind: "summary", block: null, heading: "", headingPath: "", text: summaryText(input), embedding: embedded.vectors[0] ?? [] },
        ...body.map(({ block, section }, index) => ({ ordinal: index + 1, kind: "body" as const, block: block.index, heading: block.heading, headingPath: section.headingPath.join(" > "), text: section.text, embedding: embedded.vectors[index + 1] ?? [] })),
      ];
      return { kind: "saved", saved: await store.publish({ documentId, content: input, changeNote: changeNote || null, sections }) };
    },
  };
}
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortKeys(item)]));
  return value;
}
