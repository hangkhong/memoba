import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { requestSchema } from "@/modules/analysis/schema";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({ code: "INVALID_ORIGIN", error: "Invalid request origin." }, 400);
  try {
    await requireWorkspace();
    const raw: unknown = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) return privateJson({ code: "INVALID_REQUEST", error: "Review the structured request fields." }, 400);
    // No run is admitted until knowledge storage and model capabilities are verified.
    return privateJson({ kind: "unavailable", code: "ANALYSIS_UNAVAILABLE", error: "Analysis is not connected yet. Your request has not been saved or sent to a model." }, 503);
  } catch (error) { return accessResponse(error); }
}
