// SPDX-License-Identifier: Apache-2.0
// Adapted from vercel/eve chat template. Memoba uses its own components and transcript width.
"use client";

import { ArrowDown } from "lucide-react";
import { useCallback, type ComponentProps } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatConversation({ className, ...props }: ComponentProps<typeof StickToBottom>) {
  return <StickToBottom className={cn("relative min-h-0 flex-1 overflow-y-hidden", className)} initial="instant" resize="smooth" role="log" {...props}/>;
}

export function ChatConversationContent({ className, ...props }: ComponentProps<typeof StickToBottom.Content>) {
  return <StickToBottom.Content className={cn("mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-6 md:px-10", className)} {...props}/>;
}

export function ChatScrollButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  const jump = useCallback(() => { void scrollToBottom(); }, [scrollToBottom]);
  if (isAtBottom) return null;
  return <Button aria-label="Scroll to latest message" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-sm" onClick={jump} size="icon" type="button" variant="outline"><ArrowDown className="size-4"/></Button>;
}
