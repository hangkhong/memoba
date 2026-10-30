import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return <div aria-busy="true" className="workspace-page max-w-6xl"><Skeleton className="h-8 w-56"/><Skeleton className="mt-2 mb-6 h-5 w-80 max-w-full"/>{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="mb-2 h-12 w-full"/>)}</div>;
}
