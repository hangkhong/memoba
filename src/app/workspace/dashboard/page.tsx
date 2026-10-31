import { redirect } from "next/navigation";
import { AccessError, requireWorkspace } from "@/lib/auth/workspace";
import { DashboardPage } from "@/modules/dashboard/dashboard-page";

export default async function Page() {
  const context = await requireWorkspace().catch((error: unknown) => {
    if (error instanceof AccessError && error.status === 401) redirect("/login");
    throw error;
  });
  return <DashboardPage context={context}/>;
}
