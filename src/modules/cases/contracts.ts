import { z } from "zod";
export const savedCaseSchema = z.object({ caseId: z.uuid(), revisionId: z.uuid(), indexState: z.enum(["pending", "ready", "failed"]) });
