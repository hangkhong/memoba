import { PageBar, PageFrame } from "@/components/page-frame";
import { Skeleton } from "@/components/ui/skeleton";

// Flat grey blocks at the final size, with no shimmer.
export default function Loading() {
  const flat = "animate-none";
  return <PageFrame><div aria-busy="true" className="@container flex flex-1 flex-col">
    <PageBar><Skeleton className={`size-8 md:hidden ${flat}`}/><span className="text-sm font-semibold">Dashboard</span></PageBar>
    <main className="mx-auto flex w-full max-w-[76rem] flex-col gap-6 px-(--page-inset) pt-6 pb-24">
      <Skeleton className={`h-7 w-full max-w-[36rem] ${flat}`}/>
      <Skeleton className={`h-[212px] w-full ${flat}`}/>
      <Skeleton className={`h-[360px] w-full ${flat}`}/>
      <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 @max-[1000px]:grid-cols-2 @max-[640px]:grid-cols-1"><Skeleton className={`h-[300px] @max-[1000px]:col-span-full ${flat}`}/><Skeleton className={`h-[300px] ${flat}`}/><Skeleton className={`h-[300px] ${flat}`}/></div>
    </main>
  </div></PageFrame>;
}
