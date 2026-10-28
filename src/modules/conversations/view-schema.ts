import { z } from "zod";
import { runSchema } from "@/modules/analysis/repository";
import { briefRecordSchema } from "@/modules/briefs/repository";
import { conversationSchema, turnSchema } from "./schema";
export const conversationDetailSchema = z.object({
  conversation: conversationSchema,
  turns: z.array(turnSchema.extend({ runs: z.array(runSchema.extend({ briefId: z.uuid().nullable(), brief: briefRecordSchema.nullable() })) })),
});
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;
