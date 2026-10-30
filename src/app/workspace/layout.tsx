import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { listConversations } from "@/modules/conversations/repository";
import { ChatSession } from "@/modules/conversations/chat-session";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSidebar } from "./workspace-sidebar";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({children}:{children:ReactNode}) {
  const context = await requireWorkspace().catch((error: unknown) => {
    if (error instanceof AccessError && error.status === 401) redirect("/login");
    return null;
  });
  if (!context) return <main className="p-10"><h1>Workspace unavailable</h1><Link href="/login">Return to sign in</Link></main>;
  const conversations = await listConversations(await createServerSupabase(), context);
  return <TooltipProvider><ChatSession><SidebarProvider className="bg-sidebar"><WorkspaceSidebar workspaceName={context.workspaceName} conversations={conversations}/><SidebarInset className="min-w-0 bg-sidebar"><WorkspaceHeader conversations={conversations}/><div className="min-w-0 flex-1 bg-background md:mr-2 md:mb-2 md:rounded-2xl md:border">{children}</div></SidebarInset></SidebarProvider></ChatSession></TooltipProvider>;
}
