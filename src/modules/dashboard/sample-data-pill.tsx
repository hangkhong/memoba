import { Pill } from "@/components/badges";

export function SampleDataPill() {
  return <span title="These figures are illustrative, not workspace usage" className="@max-[640px]:ml-auto"><Pill tone="warning"><span className="font-medium">Sample data</span></Pill></span>;
}
