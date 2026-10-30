"use client";
import { Streamdown, defaultRemarkPlugins, defaultRehypePlugins } from "streamdown";
import { draftDisplayText } from "./draft-text";

// The answer as the model writes it. The saved, checked answer with its sources replaces this view.
export function DraftAnswer({ text, animating }: { text: string; animating: boolean }) {
  return <Streamdown isAnimating={animating} skipHtml controls={false} className="answer-markdown" remarkPlugins={Object.values(defaultRemarkPlugins)} rehypePlugins={Object.entries(defaultRehypePlugins).filter(([name]) => name !== "raw").map(([, plugin]) => plugin)}>{draftDisplayText(text)}</Streamdown>;
}
