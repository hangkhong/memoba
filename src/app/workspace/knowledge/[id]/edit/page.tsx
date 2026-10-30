import { notFound, redirect } from "next/navigation";
import { z } from "zod";
export default async function EditCase({ params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id); if (!id.success) notFound();
  redirect(`/workspace/knowledge/${id.data}?edit=1`);
}
