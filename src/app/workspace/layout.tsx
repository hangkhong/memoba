import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { createServerSupabase } from "@/lib/supabase/server";
import { listConversations } from "@/modules/conversations/repository";
import { ChatSession } from "@/modules/conversations/chat-session";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceSidebar } from "./workspace-sidebar";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({children}:{children:ReactNode}) {
  const context = await requireWorkspace().catch((error: unknown) => {
    if (error instanceof AccessError && error.status === 401) redirect("/login");
    return null;
  });
  if (!context) return <main className="p-10"><h1>Workspace unavailable</h1><Link href="/login">Return to sign in</Link></main>;
  const conversations = await listConversations(await createServerSupabase(), context);
  return <TooltipProvider><ChatSession><SidebarProvider><WorkspaceSidebar workspaceName={context.workspaceName} conversations={conversations}/><SidebarInset><header className="flex h-14 shrink-0 items-center gap-3 border-b px-4"><SidebarTrigger/><span className="text-sm text-muted-foreground">{context.workspaceName}</span></header><div className="min-w-0 flex-1">{children}</div></SidebarInset></SidebarProvider></ChatSession></TooltipProvider>;
}
