import { redirect } from "next/navigation";
export default async function LegacyCase({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/workspace/knowledge/${(await params).id}/edit`);
}
