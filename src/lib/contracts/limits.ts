// Runtime and input limits. docs/reference/system-contracts.md links here.
export const executionLimits = Object.freeze({
  deadlineMs: 300_000,
  hostedDeadlineMs: 270_000,
  synthesisReserveMs: 60_000,
  reasoningSteps: 6,
  toolCalls: 12,
  repairCalls: 1,
  candidateSections: 40,
  contextSections: 24,
  contextTokens: 8_000,
  previewTokens: 2_666,
  previewExcerptChars: 240,
  outputTokens: 2_000,
  relationDepth: 1,
  concurrentRuns: 2,
  draftDeadlineMs: 30_000,
});
export const inputLimits = Object.freeze({ title: 200, text: 4_000, concepts: 12, hardConstraints: 8, conversationMessages: 12, importText: 12_000 });
