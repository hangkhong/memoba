"use client";
import { useSyncExternalStore } from "react";

const format = { dateStyle: "medium", timeStyle: "short" } as const;
const subscribe = () => () => {};
// Server HTML uses UTC; the browser swaps in the viewer's own time zone after hydration.
export function RevisionTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(subscribe, () => new Date(iso).toLocaleString("en-GB", format), () => `${new Date(iso).toLocaleString("en-GB", { ...format, timeZone: "UTC" })} UTC`);
  return <time dateTime={iso}>{text}</time>;
}
