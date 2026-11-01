// Heading anchors follow GitHub's rules, so `#anchor` links written for GitHub keep working in the app.
export type DocHeading = { depth: 2 | 3; text: string; id: string };

export function headingSlug(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, "").replace(/ /g, "-");
}

// A repeated heading gets -1, -2, ... the way GitHub numbers it.
export function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string): string => {
    const base = headingSlug(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

// Reads headings from the raw Markdown without a parser. Fenced code is skipped, and inline markup is reduced to its text.
export function plainHeadingText(raw: string): string {
  return raw.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*~]+/g, "").trim();
}

export function extractHeadings(markdown: string): DocHeading[] {
  const slug = createSlugger();
  const headings: DocHeading[] = [];
  let fence: string | null = null;
  for (const line of markdown.split("\n")) {
    const marker = /^\s*(```+|~~~+)/.exec(line)?.[1];
    if (marker) {
      if (fence === null) fence = marker[0] ?? null;
      else if (marker.startsWith(fence)) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const text = plainHeadingText(match[2] ?? "");
    const id = slug(text);
    const depth = match[1]?.length;
    if (depth === 2 || depth === 3) headings.push({ depth, text, id });
  }
  return headings;
}
