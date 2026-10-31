import { privateJson } from "@/lib/auth/http";
import type { DocumentSaveResult } from "./service";

// Maps a save outcome to the HTTP contract. A missing embedding model is a 503: nothing was stored.
export function documentSaveResponse(result: DocumentSaveResult) {
  if (result.kind === "invalid") return privateJson({ error: result.errors[0] ?? "Review the document fields.", errors: result.errors }, 400);
  if (result.kind === "unavailable") return privateJson({ error: "Document unavailable." }, 404);
  return privateJson(result.saved, result.saved.status === "published" ? 201 : 200);
}
