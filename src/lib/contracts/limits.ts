// Runtime and input limits. docs/reference/system-contracts.md links here.
export const executionLimits = Object.freeze({
  deadlineMs: 90_000,
  reasoningSteps: 6,
  toolCalls: 12,
  plannerCalls: 1,
  repairCalls: 1,
  planQueries: 3,
  candidateSections: 40,
  contextSections: 12,
  contextTokens: 8_000,
  outputTokens: 2_000,
  relationDepth: 1,
  concurrentRuns: 2,
  transientRetries: 1,
});
export const inputLimits = Object.freeze({ title: 200, text: 4_000, concepts: 12, hardConstraints: 8 });
