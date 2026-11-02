import { z } from "zod";
import { templateSchema } from "../cases/schema.ts";
import { inputLimits } from "../../lib/contracts/limits.ts";

const text = z.string().trim().regex(/\S/, "Enter non-empty text.").max(inputLimits.text);
export const rawMessageSchema = z.string().regex(/\S/, "Enter non-empty text.").max(inputLimits.text);
export const purposeSchema = z.enum(["method", "conditions", "exceptions"]);
export const requestSchema = z.object({
  template: templateSchema,
  version: z.literal(1),
  objective: text,
  context: text,
  hardConstraints: z.array(z.object({ kind: z.enum(["requirement", "prohibition"]), text }).strict()).max(inputLimits.hardConstraints),
  conceptIds: z.array(z.uuid()).max(inputLimits.concepts),
  unknowns: z.string().trim().max(inputLimits.text),
}).strict();
export type NormalizedRequest = z.infer<typeof requestSchema>;
// An answer is longer than a question, so history keeps a message of each role under its own cap.
export const conversationMessageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), text: rawMessageSchema }).strict(),
  z.object({ role: z.literal("assistant"), text: z.string().regex(/\S/, "Enter non-empty text.").max(inputLimits.historyAnswer) }).strict(),
]);
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export const textRunInputSchema = z.object({
  version: z.literal(2),
  message: rawMessageSchema,
  history: z.array(conversationMessageSchema).max(inputLimits.conversationMessages),
}).strict();
export const storedRunInputSchema = z.union([requestSchema, textRunInputSchema]);
export type TextRunInput = z.infer<typeof textRunInputSchema>;
export type StoredRunInput = z.infer<typeof storedRunInputSchema>;
