import { readAIConfig } from "@/lib/config/env";
import { configuredModels } from "@/lib/ai/models";
import { createServerSupabase } from "@/lib/supabase/server";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { caseRepository } from "./repository";
import { createCaseService } from "./service";
export async function caseService(context: WorkspaceContext, targetCase?: string) {
  const config = readAIConfig(process.env);
  const models = config.kind === "configured" ? configuredModels() : undefined;
  return createCaseService(caseRepository(await createServerSupabase(), context, models ?? { embeddingModel: "gemini-embedding-2", dimensions: 1536 }, targetCase), models?.embed);
}
