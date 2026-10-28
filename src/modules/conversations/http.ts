import { accessResponse, privateJson } from "@/lib/auth/http";
import { ConversationError } from "./repository";
export function conversationErrorResponse(error: unknown) {
  return error instanceof ConversationError ? privateJson({ error: error.message }, error.status) : accessResponse(error);
}
