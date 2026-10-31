"use client";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type KnowledgeTab = "cases" | "documents";
const tabs = [{ value: "cases", label: "Use cases" }, { value: "documents", label: "Documents" }] as const satisfies readonly { value: KnowledgeTab; label: string }[];

// The tab lives in the URL (?tab=documents) so a reload or a shared link opens the same list.
export function KnowledgeTabs({ tab, children }: { tab: KnowledgeTab; children: ReactNode }) {
  const router = useRouter(); const pathname = usePathname();
  return <Tabs value={tab} onValueChange={(next) => router.replace(next === "documents" ? `${pathname}?tab=documents` : pathname, { scroll: false })} className="mt-6">
    <TabsList variant="line" aria-label="Knowledge Hub">{tabs.map((item) => <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>)}</TabsList>
    <TabsContent value={tab}>{children}</TabsContent>
  </Tabs>;
}
