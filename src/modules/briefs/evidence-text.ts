import { documentTagLabel } from "./evidence-sources";

const headingLine = /^\s{0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const norm = (text: string) => text.replace(/[*_`]/g, "").trim().toLowerCase();

// The panel already shows the heading, so the excerpt does not repeat it as its own first line.
export function dropMatchingHeading(excerpt: string, heading: string) {
  const [first = "", ...rest] = excerpt.split("\n");
  const match = headingLine.exec(first);
  if (!match?.[1]) return excerpt;
  const title = norm(match[1]);
  if (title !== norm(heading) && title !== norm(documentTagLabel(heading))) return excerpt;
  return rest.join("\n").replace(/^\s*\n/, "").trimStart() || excerpt;
}
// Markdown reduced to words for places that cannot render it, such as the hover preview.
export function plainPreview(markdown: string) {
  return markdown.split("\n").filter((line) => !/^[\s:|-]*-[\s:|-]*$/.test(line))
    .map((line) => line.replace(/^\s{0,3}#{1,6}[ \t]+/, "").replace(/^\s*(?:[-*+]|\d{1,9}[.)])[ \t]+/, "").replace(/^\s*>\s?/, "").replace(/\|/g, " ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`~]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean).join(" ");
}
