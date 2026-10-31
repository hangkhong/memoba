const day = 86_400_000;
export function relativeDate(iso: string, now: number) {
  const then = new Date(iso);
  const days = Math.floor((Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate()) - Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate())) / day);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(then.getUTCFullYear() === new Date(now).getUTCFullYear() ? {} : { year: "numeric" }), timeZone: "UTC" });
}
