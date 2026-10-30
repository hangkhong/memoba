"use client";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function WorkspaceHeader({ conversations }: { conversations: { id: string; title: string }[] }) {
  const path = usePathname();
  const conversation = conversations.find((item) => path === `/workspace/chat/${item.id}`);
  const title = conversation?.title ?? (path.includes("/knowledge") ? "Knowledge Hub" : path.includes("/analyses") ? "Analysis" : path.includes("/briefs") ? "Saved answer" : "New chat");
  return <header className="flex h-12 shrink-0 items-center gap-2 px-3 md:px-4"><SidebarTrigger className="text-muted-foreground"/><p className="min-w-0 truncate text-sm font-medium">{title}</p></header>;
}
