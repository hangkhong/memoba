import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, privateJson } from "@/lib/auth/http";
export async function GET() {
  try { return privateJson(await requireWorkspace()); }
  catch (error) { return accessResponse(error); }
}
