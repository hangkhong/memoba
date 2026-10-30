import { afterEach, expect, it, vi } from "vitest";
import { draftBuffer } from "./draft-buffer";

afterEach(() => { vi.useRealTimers(); });

it("commits batched deltas once per interval and applies a reset before later text", () => {
  vi.useFakeTimers();
  let shown = "old";
  let commits = 0;
  const buffer = draftBuffer((apply) => { commits++; shown = apply(shown); }, 50);
  buffer.push({ kind: "delta", text: "A" }); buffer.push({ kind: "delta", text: "B" });
  expect(commits).toBe(0);
  vi.advanceTimersByTime(50);
  expect(shown).toBe("oldAB"); expect(commits).toBe(1);
  buffer.push({ kind: "reset" }); buffer.push({ kind: "delta", text: "C" });
  buffer.flush();
  expect(shown).toBe("C"); expect(commits).toBe(2);
  buffer.flush();
  expect(commits).toBe(2);
});
