import { sectionLabels, sectionOrder } from "./presentation";
import type { CaseInput } from "./schema";

// One pattern for every section: heading, then body, in a single column. Empty optional sections are left out.
export function CaseArticle({ content }: { content: CaseInput }) {
  const values: Record<string, unknown> = content;
  const sections = sectionOrder[content.template].flatMap((key) => {
    const value = values[key];
    const text = typeof value === "string" ? value.trim() : "";
    if (text) return [{ key, text, empty: false }];
    return key === "observedOutcome" ? [{ key, text: "No observed outcome recorded yet.", empty: true }] : [];
  });
  return <article className="flex flex-col gap-8">{sections.map(({ key, text, empty }) => <section key={key}><h2 className="text-base font-semibold">{sectionLabels[key]}</h2><p className={empty ? "mt-2 text-[15px] leading-[26px] text-muted-foreground" : "mt-2 text-[15px] leading-[26px] whitespace-pre-wrap"}>{text}</p></section>)}</article>;
}
