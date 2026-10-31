"use client";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, todayIso } from "@/lib/format-date";

const toDate = (iso: string) => { const [year = 0, month = 1, day = 1] = iso.split("-").map(Number); return new Date(year, month - 1, day); };
const toIso = (date: Date) => todayIso(date);

// Shows "31 Oct 2026" and keeps an ISO date string as its value. Days after today cannot be picked.
export function DateField({ id, value, onChange, invalid, describedBy }: { id: string; value: string; onChange: (iso: string) => void; invalid?: boolean; describedBy?: string }) {
  return <Popover>
    <PopoverTrigger render={<Button id={id} type="button" variant="outline" aria-invalid={invalid} aria-describedby={describedBy} className="w-full justify-start font-normal"/>}><CalendarIcon aria-hidden="true" className="text-muted-foreground"/>{value ? formatDate(value) : "Pick a date"}</PopoverTrigger>
    <PopoverContent align="start" className="w-auto p-0"><Calendar mode="single" selected={value ? toDate(value) : undefined} defaultMonth={value ? toDate(value) : undefined} disabled={{ after: new Date() }} onSelect={(date) => { if (date) onChange(toIso(date)); }}/></PopoverContent>
  </Popover>;
}
