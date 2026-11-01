import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { extractHeadings, type DocHeading } from "./headings";
import { findDoc, type DocPage } from "./registry";

export type LoadedDoc = { page: DocPage; markdown: string; headings: DocHeading[] };

// next.config.ts lists `docs/**` under outputFileTracingIncludes so these files ship with the serverless bundle.
export async function loadDoc(slug: string): Promise<LoadedDoc | null> {
  const page = findDoc(slug);
  if (!page) return null;
  const markdown = await readFile(join(process.cwd(), "docs", page.file), "utf8");
  return { page, markdown, headings: extractHeadings(markdown) };
}
