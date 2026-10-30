"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Option<V extends string> = { value: V; label: string };
// One labelled choice list on the shadcn Select. `items` lets the trigger show the label instead of the value.
export function OptionSelect<V extends string>({ id, items, value, onValueChange, placeholder, className, disabled, invalid }: { id: string; items: readonly Option<V>[]; value: V | null; onValueChange: (value: V) => void; placeholder?: string; className?: string; disabled?: boolean; invalid?: boolean }) {
  return <Select items={items} value={value} disabled={disabled} onValueChange={(next) => { const match = items.find((item) => item.value === next); if (match) onValueChange(match.value); }}>
    <SelectTrigger id={id} className={className} aria-invalid={invalid}><SelectValue placeholder={placeholder}/></SelectTrigger>
    <SelectContent alignItemWithTrigger={false}>{items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
  </Select>;
}
