import { z } from "zod";

export const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(256) });
export const workspaceContextSchema = z.object({
  userId: z.uuid().brand<"UserId">(),
  workspaceId: z.uuid().brand<"WorkspaceId">(),
  workspaceName: z.string().min(1),
  knowledgeVersion: z.number().int().nonnegative(),
});
export type WorkspaceContext = z.infer<typeof workspaceContextSchema>;
