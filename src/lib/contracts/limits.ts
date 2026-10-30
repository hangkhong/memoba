// Runtime and input limits. docs/reference/system-contracts.md links here.
export const executionLimits = Object.freeze({
  deadlineMs: 300_000,
  hostedDeadlineMs: 240_000,
  synthesisReserveMs: 60_000,
  reasoningSteps: 6,
  toolCalls: 12,
  repairCalls: 1,
  candidateSections: 60,
  contextSections: 48,
  contextTokens: 24_000,
  previewTokens: 4_000,
  previewExcerptChars: 240,
  searchSectionsPerCase: 2,
  outputTokens: 2_000,
  relationDepth: 1,
  concurrentRuns: 2,
  draftDeadlineMs: 30_000,
  maxModelInputTokens: 64_000,
});
export const inputLimits = Object.freeze({ title: 200, text: 4_000, concepts: 12, hardConstraints: 8, conversationMessages: 12, importText: 12_000 });
