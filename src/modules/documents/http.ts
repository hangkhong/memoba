import { privateJson } from "@/lib/auth/http";
import type { DocumentSaveResult } from "./service";

// Maps a save outcome to the HTTP contract. A missing embedding model is a 503: nothing was stored.
export function documentSaveResponse(result: DocumentSaveResult) {
  if (result.kind === "invalid") return privateJson({ error: result.errors[0] ?? "Review the document fields.", errors: result.errors }, 400);
  if (result.kind === "unavailable") return privateJson({ error: "Document unavailable." }, 404);
  return privateJson(result.saved, result.saved.status === "published" ? 201 : 200);
}

// Runs a save and turns a missing embedding model into a clear 503; other failures reach the route's error handler.
export async function respondToSave(save: () => Promise<DocumentSaveResult>) {
  try { return documentSaveResponse(await save()); }
  catch (error) {
    if (error instanceof Error && error.message === "EMBEDDING_UNAVAILABLE") return privateJson({ error: "The document could not be indexed because the embedding model is unavailable. Nothing was saved." }, 503);
    throw error;
  }
}
