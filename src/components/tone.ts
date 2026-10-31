export type Tone = "success" | "warning" | "danger" | "neutral";
// Pale tint with dark text of the same hue; the dot uses the saturated step.
export const toneStyles = {
  success: { pill: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-600" },
  warning: { pill: "bg-amber-50 text-amber-900", dot: "bg-amber-500" },
  danger: { pill: "bg-red-50 text-red-800", dot: "bg-red-600" },
  neutral: { pill: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
} satisfies Record<Tone, { pill: string; dot: string }>;
export const statusRegistry = {
  available: { label: "Available", tone: "success" },
  updating: { label: "Updating", tone: "warning" },
  preparing: { label: "Preparing", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
  archived: { label: "Archived", tone: "neutral" },
} satisfies Record<string, { label: string; tone: Tone }>;
export type Status = keyof typeof statusRegistry;
