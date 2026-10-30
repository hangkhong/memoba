"use client";
import { useState } from "react";
import { relativeDate } from "./presentation";

export function RelativeDate({ iso }: { iso: string }) {
  const [now] = useState(() => Date.now());
  return <time dateTime={iso} title={new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", timeZoneName: "short" })} suppressHydrationWarning>{relativeDate(iso, now)}</time>;
}
