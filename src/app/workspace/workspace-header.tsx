"use client";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function WorkspaceHeader() {
  const path = usePathname();
  const title = path.includes("/knowledge") ? "Knowledge Hub" : path.includes("/analyses") ? "Analysis" : path.includes("/briefs") ? "Saved answer" : "Conversations";
  return <header className="flex h-12 shrink-0 items-center gap-3 px-4 text-sm text-muted-foreground md:px-6"><SidebarTrigger/><span className="font-medium text-foreground md:hidden">The Memoba</span><span>{title}</span></header>;
}
