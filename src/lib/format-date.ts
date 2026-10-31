// One calendar-date format for the whole product, e.g. "1 Jan 2026". Accepts an ISO date or datetime and reads it in UTC.
export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
