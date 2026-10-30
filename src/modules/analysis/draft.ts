import { z } from "zod";

// Unvalidated answer text shown while the model writes. It is never saved; the checked answer replaces it.
export const draftChunkSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("delta"), text: z.string() }),
  z.object({ kind: z.literal("reset") }),
]);
export type DraftChunk = z.infer<typeof draftChunkSchema>;
export type OnDraft = (chunk: DraftChunk) => void;
