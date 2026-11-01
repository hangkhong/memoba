import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { loadDoc } from "./content";
import { DocsPage } from "./docs-page";
import { docPages, docsBasePaths, findDoc, firstDocSlug } from "./registry";

export type DocsRouteParams = { params: Promise<{ slug: string }> };

export const docStaticParams = () => docPages.map(({ slug }) => ({ slug }));
export const redirectToFirstDoc = (base: string): never => redirect(`${base}/${firstDocSlug}`);

export async function docMetadata({ params }: DocsRouteParams): Promise<Metadata> {
  const page = findDoc((await params).slug);
  return { title: page ? `${page.title} · Docs · The Memoba` : "Docs · The Memoba" };
}

export async function PublicDocsPage({ params }: DocsRouteParams) {
  const doc = await loadDoc((await params).slug);
  if (!doc) notFound();
  return <DocsPage doc={doc} base={docsBasePaths.public} bar={<>
    <Link href="/" className="text-sm font-semibold">The Memoba</Link>
    <span className="text-sm text-muted-foreground">Docs</span>
    <Link href="/login" className="ml-auto rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Open the demo</Link>
  </>}/>;
}

export async function WorkspaceDocsPage({ params }: DocsRouteParams) {
  const doc = await loadDoc((await params).slug);
  if (!doc) notFound();
  return <DocsPage doc={doc} base={docsBasePaths.workspace} bar={<><SidebarTrigger className="-ml-1 text-muted-foreground md:hidden"/><span className="text-sm font-semibold">Docs</span></>}/>;
}
