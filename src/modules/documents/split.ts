import { inputLimits } from "../../lib/contracts/limits.ts";

export type SplitLimits = { sectionChars: number; blockChars: number };
export type DocumentSection = { text: string; headingPath: string[] };
// `index` is 1-based and is the anchor and the `blocks` argument of read_document.
export type DocumentBlock = { index: number; heading: string; headingPath: string[]; text: string; sections: DocumentSection[] };
export type SplitError = { code: "EMPTY" | "SECTION_TOO_LONG" | "BLOCK_TOO_LONG"; heading: string; message: string };
export type SplitResult = { kind: "ok"; blocks: DocumentBlock[] } | { kind: "invalid"; errors: SplitError[] };

type Atom = { start: number; end: number; heading: boolean };
type Heading = { line: number; level: number; title: string };

const fenceOpen = /^ {0,3}(`{3,}|~{3,})/;
const headingLine = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const listItem = /^( *)(?:[-*+]|\d{1,9}[.)])[ \t]+\S/;
const blank = (line: string) => !/\S/.test(line);
const indent = (line: string) => line.length - line.trimStart().length;
const overviewLabel = "Overview";

function scanHeadings(lines: string[]): Heading[] {
  const headings: Heading[] = [];
  let fence: string | null = null;
  lines.forEach((line, index) => {
    const open = fenceOpen.exec(line);
    if (fence) { if (open && open[1]?.[0] === fence[0] && (open[1]?.length ?? 0) >= fence.length && !line.trim().slice(open[1]?.length ?? 0).trim()) fence = null; return; }
    if (open?.[1]) { fence = open[1]; return; }
    const match = headingLine.exec(line);
    if (match?.[1] && match[2]) headings.push({ line: index, level: match[1].length, title: match[2].trim() });
  });
  return headings;
}

// Splits Markdown into blocks, then packs whole atoms (paragraph, table, fence, list item) into sections.
// Section text is the verbatim source lines, so every non-blank source line lands in exactly one section, in order.
export function splitDocument(title: string, markdown: string, limits: SplitLimits = { sectionChars: inputLimits.text, blockChars: inputLimits.documentBlock }): SplitResult {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  if (lines.every(blank)) return { kind: "invalid", errors: [{ code: "EMPTY", heading: title, message: "Add the document content." }] };
  const headings = scanHeadings(lines);
  const headingAt = new Map(headings.map((heading) => [heading.line, heading]));
  // Heading path in effect at the end of each line, so a section reports the headings above its first line.
  const stack: Heading[] = [];
  const pathAt: string[][] = lines.map((_, index) => {
    const heading = headingAt.get(index);
    if (heading) { while (stack.length && (stack.at(-1)?.level ?? 0) >= heading.level) stack.pop(); stack.push(heading); }
    return stack.map((item) => item.title);
  });
  const counts = new Map<number, number>();
  for (const heading of headings) counts.set(heading.level, (counts.get(heading.level) ?? 0) + 1);
  const splitLevel = [...counts].filter(([, count]) => count >= 2).map(([level]) => level).sort((a, b) => a - b)[0];
  // Shallower headings before the first split heading belong to the intro; later ones end the previous subtree and start their own.
  const firstSplit = headings.find((heading) => heading.level === splitLevel)?.line ?? 0;
  const starts = splitLevel === undefined ? [] : headings.filter((heading) => heading.level <= splitLevel && heading.line >= firstSplit).map((heading) => heading.line);
  const ranges: { start: number; end: number; label: string }[] = [];
  const firstStart = starts[0];
  if (firstStart === undefined) ranges.push({ start: 0, end: lines.length, label: headings[0]?.title ?? title });
  else {
    if (lines.slice(0, firstStart).some((line) => !blank(line))) ranges.push({ start: 0, end: firstStart, label: overviewLabel });
    starts.forEach((start, index) => ranges.push({ start, end: starts[index + 1] ?? lines.length, label: headingAt.get(start)?.title ?? overviewLabel }));
  }

  const errors: SplitError[] = [];
  const blocks: DocumentBlock[] = [];
  for (const range of ranges) {
    const first = lines.findIndex((line, index) => index >= range.start && index < range.end && !blank(line));
    if (first < 0) continue;
    let last = range.end - 1; while (blank(lines[last] ?? "")) last--;
    const where = (line: number) => { const path = pathAt[line] ?? []; return path.at(-1) ?? "the text before the first heading"; };
    const text = lines.slice(first, last + 1).join("\n");
    if (text.length > limits.blockChars) { errors.push({ code: "BLOCK_TOO_LONG", heading: where(first), message: `The block under “${where(first)}” is over ${limits.blockChars.toLocaleString("en-US")} characters. Split it with more headings.` }); continue; }
    const atoms = atomsIn(lines, first, last + 1);
    const sections: DocumentSection[] = [];
    let current: Atom[] = [];
    const length = (group: Atom[]) => lines.slice(group[0]?.start ?? 0, (group.at(-1)?.end ?? 0) + 1).join("\n").length;
    const flush = (carry: Atom[]) => { if (current.length) sections.push(section(title, lines, pathAt, current)); current = carry; };
    for (const atom of atoms) {
      if (length([atom]) > limits.sectionChars) { errors.push({ code: "SECTION_TOO_LONG", heading: where(atom.start), message: `A paragraph, table, code block, or list item under “${where(atom.start)}” is over ${limits.sectionChars.toLocaleString("en-US")} characters. Shorten or split it.` }); continue; }
      if (current.length && length([...current, atom]) <= limits.sectionChars) { current.push(atom); continue; }
      // A heading never ends a section: it moves with the content it introduces.
      const tail = current.at(-1);
      if (current.length > 1 && tail?.heading && length([tail, atom]) <= limits.sectionChars) { const carried = current.pop(); flush(carried ? [carried] : []); }
      else flush([]);
      current.push(atom);
    }
    flush([]);
    blocks.push({ index: blocks.length + 1, heading: range.label, headingPath: dedupePath(title, pathAt[first] ?? []), text, sections });
  }
  return errors.length ? { kind: "invalid", errors } : { kind: "ok", blocks };
}

function dedupePath(title: string, path: string[]) { return path[0]?.toLocaleLowerCase() === title.trim().toLocaleLowerCase() ? path.slice(1) : path; }
function section(title: string, lines: string[], pathAt: string[][], group: Atom[]): DocumentSection {
  const start = group[0]?.start ?? 0;
  return { text: lines.slice(start, (group.at(-1)?.end ?? start) + 1).join("\n"), headingPath: dedupePath(title, pathAt[start] ?? []) };
}

const startsBlock = (line: string) => headingLine.test(line) || fenceOpen.test(line) || listItem.test(line) || line.trimStart().startsWith("|");

function atomsIn(lines: string[], from: number, to: number): Atom[] {
  const atoms: Atom[] = [];
  let i = from;
  while (i < to) {
    const line = lines[i] ?? "";
    if (blank(line)) { i++; continue; }
    const open = fenceOpen.exec(line);
    if (open?.[1]) {
      const marker = open[1]; let j = i + 1;
      while (j < to) { const close = fenceOpen.exec(lines[j] ?? ""); if (close?.[1] && close[1][0] === marker[0] && close[1].length >= marker.length && !(lines[j] ?? "").trim().slice(close[1].length).trim()) break; j++; }
      const end = Math.min(j, to - 1); atoms.push({ start: i, end, heading: false }); i = end + 1; continue;
    }
    if (headingLine.test(line)) { atoms.push({ start: i, end: i, heading: true }); i++; continue; }
    if (line.trimStart().startsWith("|")) { let j = i; while (j + 1 < to && (lines[j + 1] ?? "").trimStart().startsWith("|")) j++; atoms.push({ start: i, end: j, heading: false }); i = j + 1; continue; }
    const item = listItem.exec(line);
    if (item) {
      const base = (item[1] ?? "").length; let end = i; let j = i + 1;
      while (j < to) {
        const next = lines[j] ?? "";
        if (blank(next)) { let k = j + 1; while (k < to && blank(lines[k] ?? "")) k++; if (k < to && indent(lines[k] ?? "") > base) { end = k; j = k + 1; continue; } break; }
        if (indent(next) > base) { end = j; j++; continue; }
        if (!startsBlock(next) && !blank(lines[j - 1] ?? "")) { end = j; j++; continue; }
        break;
      }
      atoms.push({ start: i, end, heading: false }); i = end + 1; continue;
    }
    let j = i;
    while (j + 1 < to && !blank(lines[j + 1] ?? "") && !startsBlock(lines[j + 1] ?? "")) j++;
    atoms.push({ start: i, end: j, heading: false }); i = j + 1;
  }
  return atoms;
}

// Text embedded for a body section: the document title and heading path above the verbatim text.
export function sectionEmbeddingText(title: string, section: DocumentSection) {
  return `${[title, ...section.headingPath].join(" > ")}\n${section.text}`;
}
