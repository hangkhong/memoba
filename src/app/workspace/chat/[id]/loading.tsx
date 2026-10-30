import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return <div aria-busy="true" className="flex h-[calc(100svh-3rem)] min-w-0 flex-1 flex-col md:h-svh"><div className="mx-auto flex w-full max-w-[var(--transcript-width)] flex-1 flex-col gap-6 px-4 py-6 md:px-8"><Skeleton className="ml-auto h-12 w-2/3 rounded-2xl"/><Skeleton className="h-5 w-1/3"/><Skeleton className="h-24 w-full"/><Skeleton className="h-16 w-5/6"/></div><div className="mx-auto w-full max-w-[var(--transcript-width)] px-4 pt-2 pb-4 md:px-8"><Skeleton className="h-14 w-full rounded-2xl"/></div></div>;
}
