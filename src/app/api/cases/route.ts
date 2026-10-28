import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { caseInputSchema } from "@/modules/cases/schema";
import { caseService } from "@/modules/cases/runtime";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid origin." }, 400);
  try {
    const context = await requireWorkspace();
    const input = caseInputSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return privateJson({ error: "Review the case fields." }, 400);
    return privateJson(await (await caseService(context)).save(input.data), 201);
  } catch (error) { return accessResponse(error); }
}
