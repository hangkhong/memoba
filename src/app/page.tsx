import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/landing/site-header";
import { Close, EngineSection, Hero, Honesty, Problem, TwoMemories, Workspace } from "@/components/landing/sections";
import "@/components/landing/landing.css";

/** proxy.ts does not cover "/", so the signed-in check lives here. A visitor, an auth error, or an unconfigured Supabase all see the landing page. */
async function hasSession() {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    return !error && data.user !== null;
  } catch {
    return false;
  }
}

export default async function Home() {
  if (await hasSession()) redirect("/workspace/chat");
  return (
    <div className="lp">
      <SiteHeader />
      <main id="top">
        <Hero />
        <Problem />
        <TwoMemories />
        <EngineSection />
        <Workspace />
        <Honesty />
      </main>
      <Close />
    </div>
  );
}
