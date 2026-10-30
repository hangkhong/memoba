"use client";
import { demoPrompts } from "../../../evals/demo/prompts";
import { Button } from "@/components/ui/button";

export function SuggestedPrompts({ onPick }: { onPick: (message: string) => void }) {
  return <div className="mt-6"><div className="flex flex-wrap gap-2">{demoPrompts.map((prompt) => <Button key={prompt.label} type="button" variant="outline" size="sm" onClick={() => onPick(prompt.message)}>{prompt.label}</Button>)}</div>
  </div>;
}
