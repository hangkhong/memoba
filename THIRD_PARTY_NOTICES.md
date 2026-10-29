# Third-party notices

## Eve chat template

The earlier chat scrolling components were adapted from the [Eve chat template](https://github.com/vercel/eve/tree/1cf022a6d2c096d30c62024dade8f093b456947e/apps/templates/eve-chat-template), published by Vercel under Apache License 2.0. Memoba changes the component primitives, transcript width, initial scrolling, and accessible names.

The current viewport uses shadcn Message Scroller. The composer retains keyboard and cancellation interaction patterns from that integration. Memoba keeps its own structured request form, analysis events, source citations, authentication, and persistence. The Eve runtime is not included.

The upstream revision is `1cf022a6d2c096d30c62024dade8f093b456947e`. The license is reproduced in [LICENSES/eve-Apache-2.0.txt](LICENSES/eve-Apache-2.0.txt).

## shadcn/ui and AI Elements

Components in `src/components/ui` were added with shadcn CLI using the Base Nova registry. Conversation compositions follow the Base UI AI Elements patterns for Chat, Message, Chain of Thought, Prompt Input, Inline Citation, and Sources. The upstream project is [shadcn/ui](https://github.com/shadcn-ui/ui), published under the MIT license. Memoba adapts presentation tokens and connects the patterns to its own events and authorized evidence.

The MIT license is reproduced in [LICENSES/shadcn-MIT.txt](LICENSES/shadcn-MIT.txt).
