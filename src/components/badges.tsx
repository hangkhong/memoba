import { cn } from "cn";
import { statusRegistry, toneStyles, type Status, type Tone } from "./tone";

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs whitespace-nowrap", toneStyles[tone].pill)}>{children}</span>;
}
export function StatusDot({ status }: { status: Status }) {
  const { label, tone } = statusRegistry[status];
  return <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap"><span aria-hidden="true" className={cn("size-1.5 rounded-full", toneStyles[tone].dot)}/>{label}</span>;
}
export function Tag({ children }: { children: React.ReactNode }) { return <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground">{children}</span>; }
// A tag that opens something. Same look as `Tag`, with hover and focus states.
export function TagButton({ children, ...props }: React.ComponentProps<"button">) {
  return <button type="button" {...props} className={cn("inline-flex cursor-pointer items-center rounded-md bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none", props.className)}>{children}</button>;
}
