import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { configuredModels } from "@/lib/ai/models";
import { readAIConfig } from "@/lib/config/env";
import { inputLimits } from "@/lib/contracts/limits";
import { draftCaseFromText } from "@/modules/cases/draft";
import { draftRequestSchema } from "@/modules/cases/draft-contract";

export const maxDuration = 60;
const failures = { TIMED_OUT: [504, "Drafting took too long. Try shorter notes."], INVALID_OUTPUT: [502, "The draft could not be read. Try again or fill the form by hand."], PROVIDER_ERROR: [502, "The drafting service failed. Try again or fill the form by hand."] } as const;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid origin." }, 400);
  const requestId = crypto.randomUUID();
  const started = Date.now();
  try {
    await requireWorkspace();
    const parsed = draftRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return privateJson({ error: `Paste between 1 and ${inputLimits.importText.toLocaleString("en-US")} characters of notes.` }, 400);
    if (readAIConfig(process.env).kind !== "configured") return privateJson({ error: "AI drafting is unavailable." }, 503);
    const result = await draftCaseFromText(parsed.data, { model: configuredModels().reasoning, signal: request.signal });
    process.stdout.write(JSON.stringify({ requestId, route: "case_draft", kind: result.kind, code: result.kind === "error" ? result.code : undefined, usage: result.kind === "draft" ? result.usage : undefined, durationMs: Date.now() - started }) + "\n");
    if (result.kind === "draft") return privateJson(result);
    const [status, error] = failures[result.code];
    return privateJson({ code: result.code, error }, status);
  } catch (error) { return accessResponse(error); }
}
