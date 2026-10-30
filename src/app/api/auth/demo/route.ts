import { requireWorkspace } from "@/lib/auth/workspace";
import { accessResponse, isSameOrigin, privateJson } from "@/lib/auth/http";
import { readDemoConfig } from "@/lib/config/env";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return privateJson({ error: "Invalid request origin." }, 400);
  const demo = readDemoConfig(process.env);
  if (demo.kind !== "configured") return privateJson({ error: "Not found." }, 404);
  try {
    const supabase = await createServerSupabase();
    const result = await supabase.auth.signInWithPassword({ email: demo.value.email, password: demo.value.password });
    if (result.error) return privateJson({ error: "The demo workspace is unavailable." }, 503);
    try { await requireWorkspace(); }
    catch (error) { await supabase.auth.signOut(); return accessResponse(error); }
    return privateJson({ kind: "success" });
  } catch (error) { return accessResponse(error); }
}
