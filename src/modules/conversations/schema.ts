import { z } from "zod";
import { inputLimits } from "../../lib/contracts/limits.ts";
import { requestSchema } from "../analysis/schema.ts";

export const createConversationSchema = z.object({ id: z.uuid() }).strict();
export const turnInputSchema = z.object({
  key: z.uuid(),
  parentTurnId: z.uuid().nullable(),
  message: z.string().trim().min(1).max(inputLimits.text),
  request: requestSchema,
}).strict();
export type TurnInput = z.infer<typeof turnInputSchema>;
export const conversationSchema = z.object({
  id: z.uuid(), author_id: z.uuid(), title: z.string(),
  created_at: z.iso.datetime({ offset: true }), updated_at: z.iso.datetime({ offset: true }),
});
export const turnSchema = z.object({
  id: z.uuid(), conversation_id: z.uuid(), position: z.number().int().positive(),
  parent_turn_id: z.uuid().nullable(), message: z.string(), request: requestSchema,
  created_at: z.iso.datetime({ offset: true }),
});
export type ConversationTurn = z.infer<typeof turnSchema>;
