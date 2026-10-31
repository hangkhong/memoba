import type { ReactNode } from "react";
import { cn } from "cn";

// The bordered block every dashboard section uses, so headers and empty lines match.
export function Panel({ title, count, help, action, className, children, ...props }: { title: string; count?: number; help?: ReactNode; action?: ReactNode; className?: string; children: ReactNode } & Omit<React.ComponentProps<"section">, "title">) {
  return <section {...props} aria-label={title} className={cn("min-w-0 rounded-lg border", className)}>
    <div className="flex items-baseline gap-2 px-4 py-3"><h2 className="text-sm font-semibold">{title}</h2>{count !== undefined && <span className="text-[13px] text-muted-foreground">{count}</span>}{help && <span className="self-center">{help}</span>}{action && <span className="ml-auto">{action}</span>}</div>
    {children}
  </section>;
}
export const rowClass = "border-t px-4 py-[9px] @max-[640px]:py-2.5";
export function EmptyLine({ children }: { children: ReactNode }) { return <p className="border-t px-4 py-3 text-[13px] text-muted-foreground">{children}</p>; }
