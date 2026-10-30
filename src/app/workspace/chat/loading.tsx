import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return <div aria-busy="true" className="mx-auto flex min-h-[calc(100svh-3rem)] md:min-h-svh w-full max-w-[var(--transcript-width)] flex-col justify-center gap-3 px-4 py-12 md:px-8"><Skeleton className="h-8 w-72 max-w-full"/><Skeleton className="mb-4 h-5 w-96 max-w-full"/><Skeleton className="h-14 w-full rounded-2xl"/></div>;
}
