import { loginSchema } from "@/lib/auth/schema";
import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 400);
  const raw: unknown = await request.json().catch(() => null);
  const input = loginSchema.safeParse(raw);
  if (!input.success) return privateJson({ error: "Enter a valid email and password." }, 400);
  try {
    const supabase = await createServerSupabase();
    const result = await supabase.auth.signInWithPassword(input.data);
    if (result.error) return privateJson({ error: "Email or password is incorrect." }, 401);
    try { await requireWorkspace(); }
    catch (error) { await supabase.auth.signOut(); return accessResponse(error); }
    return privateJson({ kind: "success" });
  } catch (error) { return accessResponse(error); }
}
