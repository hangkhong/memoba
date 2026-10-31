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
  previewTokens: 8_000,
  previewExcerptChars: 240,
  searchSectionsPerCase: 2,
  outputTokens: 2_000,
  relationDepth: 1,
  concurrentRuns: 2,
  draftDeadlineMs: 30_000,
  maxModelInputTokens: 64_000,
  // Process documents have their own search quota and read pool so they never take case budget.
  documentCandidates: 5,
  documentPreviewTokens: 3_000,
  documentContextSections: 24,
  documentContextTokens: 12_000,
});
// Most sources one answer can cite: the case pool plus the document pool.
export const citationLimit = executionLimits.contextSections + executionLimits.documentContextSections;
export const inputLimits = Object.freeze({ title: 200, text: 4_000, concepts: 12, hardConstraints: 8, conversationMessages: 12, importText: 12_000, documentDescription: 600, documentBody: 60_000, documentBlock: 12_000 });
