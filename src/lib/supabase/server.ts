import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readAppConfig } from "@/lib/config/env";
import type { Database } from "./database.types";

export async function createServerSupabase() {
  const config = readAppConfig(process.env);
  if (config.kind !== "configured") throw new Error("SUPABASE_UNAVAILABLE");
  const cookieStore = await cookies();
  return createServerClient<Database>(config.value.NEXT_PUBLIC_SUPABASE_URL, config.value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot write cookies. proxy.ts refreshes them. */ }
      },
    },
  });
}
