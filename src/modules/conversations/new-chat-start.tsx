"use client";
import { useState } from "react";
import { Composer } from "./composer";
import { SuggestedPrompts } from "./suggested-prompts";

export function NewChatStart({ concepts }: { concepts: { id: string; label: string }[] }) {
  const [prefill, setPrefill] = useState<{ text: string; id: number } | undefined>();
  return <>
    <Composer concepts={concepts} prefill={prefill}/>
    <SuggestedPrompts onPick={(text) => setPrefill((current) => ({ text, id: (current?.id ?? 0) + 1 }))}/>
  </>;
}
