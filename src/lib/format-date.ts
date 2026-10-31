// One calendar-date format for the whole product, e.g. "1 Jan 2026". Accepts an ISO date or datetime and reads it in UTC.
export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
// Today in the viewer's calendar, as an ISO date.
export function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
