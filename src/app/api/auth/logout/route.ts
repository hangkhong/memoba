import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { createServerSupabase } from "@/lib/supabase/server";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 400);
  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.signOut();
    return error ? privateJson({ error: "Sign out failed." }, 503) : privateJson({ kind: "success" });
  } catch (error) { return accessResponse(error); }
}
