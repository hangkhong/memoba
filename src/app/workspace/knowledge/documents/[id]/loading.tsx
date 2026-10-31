import { Skeleton } from "@/components/ui/skeleton";
import { PageBar, PageBody, PageFrame } from "@/components/page-frame";
export default function Loading() {
  return <div aria-busy="true"><PageFrame>
    <PageBar><Skeleton className="size-8 md:hidden"/><Skeleton className="size-8"/><Skeleton className="h-5 w-1/3"/></PageBar>
    <PageBody>
      <div className="flex max-w-[42.5rem] flex-col gap-8 min-[1281px]:mx-auto min-[1281px]:w-full"><Skeleton className="h-12 w-full"/>{[0, 1, 2].map((item) => <div key={item}><Skeleton className="h-5 w-40"/><Skeleton className="mt-3 h-20 w-full"/></div>)}</div>
      <div className="flex flex-col gap-3"><Skeleton className="h-64 w-full rounded-xl"/><Skeleton className="h-40 w-full rounded-xl"/></div>
    </PageBody>
  </PageFrame></div>;
}
