import { readAIConfig, readEmbeddingProfile } from "@/lib/config/env";
import { configuredModels } from "@/lib/ai/models";
import { createServerSupabase } from "@/lib/supabase/server";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { caseRepository } from "./repository";
import { createCaseService } from "./service";
export async function caseService(context: WorkspaceContext, targetCase?: string) {
  const config = readAIConfig(process.env);
  const models = config.kind === "configured" ? configuredModels() : undefined;
  const selectedProfile = readEmbeddingProfile(process.env);
  if (selectedProfile.kind === "invalid") throw new Error("EMBEDDING_CONFIG_INVALID");
  const profile = models ?? (selectedProfile.kind === "configured" ? selectedProfile.value : { embeddingModel: "gemini-embedding-2", dimensions: 1536 });
  return createCaseService(caseRepository(await createServerSupabase(), context, profile, targetCase), models?.embed);
}
