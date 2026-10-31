"use client";
import { SafeMarkdown } from "@/components/safe-markdown";
import { draftDisplayText } from "./draft-text";

// The answer as the model writes it. The saved, checked answer with its sources replaces this view.
export function DraftAnswer({ text, animating }: { text: string; animating: boolean }) {
  return <SafeMarkdown isAnimating={animating}>{draftDisplayText(text)}</SafeMarkdown>;
}
