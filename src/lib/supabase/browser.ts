"use client";
import { createBrowserClient } from "@supabase/ssr";
import { readAppConfig } from "@/lib/config/env";
import type { Database } from "./database.types";

export function createBrowserSupabase() {
  const config = readAppConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (config.kind !== "configured") throw new Error("SUPABASE_UNAVAILABLE");
  return createBrowserClient<Database>(config.value.NEXT_PUBLIC_SUPABASE_URL, config.value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
