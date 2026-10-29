import { z } from "zod";
import { storedRunSchema } from "@/modules/analysis/repository";
import { storedBriefRecordSchema } from "@/modules/briefs/repository";
import { conversationSchema, storedTurnSchema } from "./schema";
export const conversationDetailSchema = z.object({
  conversation: conversationSchema,
  turns: z.array(storedTurnSchema.extend({ runs: z.array(storedRunSchema.extend({ briefId: z.uuid().nullable(), brief: storedBriefRecordSchema.nullable() })) })),
});
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;
