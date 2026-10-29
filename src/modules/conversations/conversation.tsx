"use client";
import type { ComponentProps } from "react";
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerProvider, MessageScrollerViewport } from "@/components/ui/message-scroller";
import { cn } from "@/lib/utils";

export function ChatConversation({ children, ...props }: ComponentProps<"div">) {
  return <MessageScrollerProvider autoScroll defaultScrollPosition="end"><MessageScroller className="min-h-0 flex-1"><MessageScrollerViewport role="log" {...props}>{children}</MessageScrollerViewport><MessageScrollerButton aria-label="Scroll to latest message"/></MessageScroller></MessageScrollerProvider>;
}
export function ChatConversationContent({ className, ...props }: ComponentProps<"div">) {
  return <MessageScrollerContent className={cn("mx-auto w-full max-w-[var(--transcript-width)] gap-8 px-4 py-6 md:px-8", className)} {...props}/>;
}
