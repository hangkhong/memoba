import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return <div aria-busy="true" className="workspace-page max-w-6xl"><Skeleton className="h-8 w-2/3"/><Skeleton className="mt-2 mb-6 h-5 w-48"/><Skeleton className="mb-3 h-24 w-full"/><Skeleton className="mb-3 h-24 w-full"/><Skeleton className="h-24 w-full"/></div>;
}
