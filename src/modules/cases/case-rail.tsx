import type { ReactNode } from "react";
import { cn } from "cn";
import { Pill, Tag } from "./case-badges";
import { RevisionTime } from "./revision-time";
import type { VersionRow, VersionState } from "./revision-history";
import type { Tone } from "./presentation";

export function RailLayer({ label, children }: { label: string; children: ReactNode }) {
  return <section aria-label={label} className="rounded-xl border bg-background">{children}</section>;
}
export function RailSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <div className="border-t px-4 py-3.5 first:border-t-0"><div className="mb-2 flex min-h-6 items-center justify-between gap-2"><h2 className="text-sm font-medium">{title}</h2>{action}</div>{children}</div>;
}
export function DetailRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return <dl className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">{rows.map((row) => <div key={row.label} className="contents"><dt className="text-muted-foreground">{row.label}</dt><dd className="min-w-0">{row.value}</dd></div>)}</dl>;
}
export function TagList({ labels }: { labels: string[] }) { return <div className="flex flex-wrap gap-1.5">{labels.map((label) => <Tag key={label}>{label}</Tag>)}</div>; }

const versionStates = { live: { label: "Live", tone: "success" }, preparing: { label: "Preparing", tone: "neutral" }, failed: { label: "Couldn't prepare", tone: "danger" } } satisfies Record<VersionState, { label: string; tone: Tone }>;
export function VersionHistory({ rows }: { rows: VersionRow[] }) {
  return <ol className="text-sm">{rows.map((row, index) => { const state = row.state && versionStates[row.state]; return <li key={row.id} className={cn("relative pl-5", index < rows.length - 1 && "pb-4")}>
    <span aria-hidden="true" className={cn("absolute top-[7px] left-[3px] size-[7px] rounded-full", row.state === "live" ? "bg-emerald-600" : "bg-input")}/>
    {index < rows.length - 1 && <span aria-hidden="true" className="absolute top-[18px] -bottom-1 left-[6px] w-px bg-border"/>}
    <div className="flex items-center justify-between gap-2"><span className="font-medium">Version {row.number}</span>{state && <Pill tone={state.tone}>{state.label}</Pill>}</div>
    <p className="text-xs leading-4 text-muted-foreground"><RevisionTime iso={row.createdAt}/></p>
    <p className="text-xs leading-4 text-muted-foreground">{row.summary}</p>
  </li>; })}</ol>;
}
