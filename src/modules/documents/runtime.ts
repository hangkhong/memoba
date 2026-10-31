import { readAIConfig, readEmbeddingProfile } from "@/lib/config/env";
import { configuredModels } from "@/lib/ai/models";
import { createServerSupabase } from "@/lib/supabase/server";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { documentRepository } from "./repository";
import { createDocumentService } from "./service";

// Publishing embeds first, so a document cannot be saved without a configured embedding model.
export async function documentService(context: WorkspaceContext) {
  const config = readAIConfig(process.env);
  const selectedProfile = readEmbeddingProfile(process.env);
  if (selectedProfile.kind === "invalid") throw new Error("EMBEDDING_CONFIG_INVALID");
  const models = config.kind === "configured" ? configuredModels() : undefined;
  const profile = models ?? (selectedProfile.kind === "configured" ? selectedProfile.value : { embeddingModel: "gemini-embedding-2", dimensions: 1536 });
  const unavailable = async () => ({ kind: "error", code: "EMBEDDING_UNAVAILABLE", retryable: false }) as const;
  return createDocumentService(documentRepository(await createServerSupabase(), context, profile), models?.embed ?? unavailable, profile);
}
