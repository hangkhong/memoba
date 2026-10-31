import type { ReactNode } from "react";

// Header and body read the same --page-inset, so the rail's right edge always lands on the header's right edge.
export function PageFrame({ children }: { children: ReactNode }) {
  return <div className="flex min-h-svh flex-col [--page-inset:1rem] md:[--page-inset:1.5rem]">{children}</div>;
}
// data-page-bar tells the workspace layout to drop its own mobile bar, so the page shows one 48px row.
export function PageBar({ children }: { children: ReactNode }) {
  return <header data-page-bar className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-(--page-inset)">{children}</header>;
}
// From 1281px the rail stays in view under the 48px bar while the article scrolls, and scrolls inside itself when it is taller than the space left.
export function PageRail({ label, children }: { label: string; children: ReactNode }) {
  return <aside aria-label={label} className="flex min-w-0 flex-col gap-3 text-sm min-[1281px]:sticky min-[1281px]:top-[4.5rem] min-[1281px]:max-h-[calc(100svh-6rem)] min-[1281px]:self-start min-[1281px]:overflow-y-auto">{children}</aside>;
}
// The rail sits beside the article from 1281px, where a 228px sidebar still leaves the article about 625px.
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="grid gap-8 px-(--page-inset) pt-8 pb-24 min-[1281px]:grid-cols-[minmax(0,1fr)_21.25rem] min-[1281px]:gap-10">{children}</div>;
}
