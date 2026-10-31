"use client";
import { useId, useMemo } from "react";
import { SafeMarkdown } from "@/components/safe-markdown";
import type { TextAnswer } from "./schema";
import type { EvidenceItem } from "@/modules/knowledge/contracts";
import { citationPresentation } from "./citation-presentation";
import { InlineEvidence } from "./evidence-view";

export function AnswerMarkdown({ answer, evidence }: { answer: TextAnswer; evidence: readonly EvidenceItem[] }) {
  const id = useId();
  const citations = useMemo(() => citationPresentation(answer, evidence, id), [answer, evidence, id]);
  return <SafeMarkdown mode="static" extraRemarkPlugins={[citations.plugin]} components={{ strong: ({ children }) => <strong>{children}</strong>, a: ({ href, children }) => {
    const citation = href ? citations.resolve(href) : undefined;
    return citation ? <InlineEvidence item={citation.evidence} number={citation.number}/> : <a href={href} rel="noopener noreferrer">{children}</a>;
  } }}>{answer.text}</SafeMarkdown>;
}
