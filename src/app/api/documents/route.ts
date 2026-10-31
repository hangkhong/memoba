import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { documentService } from "@/modules/documents/runtime";
import { documentSaveResponse } from "@/modules/documents/http";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid origin." }, 400);
  try {
    const context = await requireWorkspace();
    return documentSaveResponse(await (await documentService(context)).save(await request.json().catch(() => null)));
  } catch (error) { return accessResponse(error); }
}
