import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { documentService } from "@/modules/documents/runtime";
import { respondToSave } from "@/modules/documents/http";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid origin." }, 400);
  try {
    const context = await requireWorkspace();
    const body = await request.json().catch(() => null);
    return await respondToSave(async () => (await documentService(context)).save(body));
  } catch (error) { return accessResponse(error); }
}
