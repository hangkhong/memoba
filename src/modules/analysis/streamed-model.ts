import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

type CallOptions = Parameters<MockLanguageModelV4["doGenerate"]>[0];
type GenerateResult = Awaited<ReturnType<MockLanguageModelV4["doGenerate"]>>;
type StreamOf = Awaited<ReturnType<MockLanguageModelV4["doStream"]>>["stream"];
type StreamPart = StreamOf extends ReadableStream<infer P> ? P : never;

// Test helper: serves a doGenerate-style result as a stream (text in two chunks) for code that streams.
export function streamedModel({ doGenerate }: { doGenerate: (options: CallOptions) => Promise<GenerateResult> }) {
  return new MockLanguageModelV4({ doStream: async (options) => {
    const result = await doGenerate(options);
    const chunks = result.content.flatMap((part): StreamPart[] => part.type === "text"
      ? [{ type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: part.text.slice(0, 8) }, { type: "text-delta", id: "t", delta: part.text.slice(8) }, { type: "text-end", id: "t" }]
      : part.type === "tool-call" ? [{ type: "tool-call", toolCallId: part.toolCallId, toolName: part.toolName, input: part.input }] : []);
    return { stream: simulateReadableStream({ chunks: [...chunks, { type: "finish", finishReason: result.finishReason, usage: result.usage }] }) as StreamOf };
  } });
}
