import type { CaseInput, SectionKey } from "./schema";

type Saved = { caseId: string; revisionId: string; indexState: "pending" | "ready" | "failed" };
export type CaseStore = {
  save: (input: CaseInput) => Promise<Saved>;
  revision: (id: string) => Promise<Saved & { input: CaseInput }>;
  index: (id: string, sections: { key: SectionKey; text: string; embedding: number[] }[]) => Promise<Saved>;
  fail: (id: string) => Promise<void>;
};
type Embed = (args: { texts: string[]; signal: AbortSignal }) => Promise<{ kind: "success"; vectors: number[][]; tokens: number | null } | { kind: "error"; code: string; retryable: boolean }>;
export function caseSections(input: CaseInput): { key: SectionKey; text: string }[] {
  const common = ["problem", "context", "constraints", "approach", "observedOutcome", "lessons"] satisfies SectionKey[];
  return [
    ...common.map((key) => ({ key, text: input[key] })),
    ...(input.template === "product_delivery" ? [
      { key: "deliverable" as const, text: input.deliverable }, { key: "changeScope" as const, text: input.changeScope }, { key: "deploymentConditions" as const, text: input.deploymentConditions },
    ] : [
      { key: "customerImpact" as const, text: input.customerImpact }, { key: "handlingConditions" as const, text: input.handlingConditions }, { key: "escalationNotes" as const, text: input.escalationNotes },
    ]),
  ];
}
export function createCaseService(store: CaseStore, embed?: Embed) {
  async function reindex(revisionId: string): Promise<Saved> {
    const revision = await store.revision(revisionId);
    const saved = { caseId: revision.caseId, revisionId, indexState: revision.indexState };
    if (revision.indexState === "ready") return saved;
    try {
      if (!embed) { await store.fail(revisionId); return { ...saved, indexState: "failed" }; }
      const sections = caseSections(revision.input);
      const result = await embed({ texts: sections.map((section) => `${revision.input.title}\n${section.text}`), signal: AbortSignal.timeout(60000) });
      if (result.kind === "error") { await store.fail(revisionId); return { ...saved, indexState: "failed" }; }
      return await store.index(revisionId, sections.map((section, index) => {
        const embedding = result.vectors[index];
        if (!embedding) throw new Error("INVALID_EMBEDDINGS");
        return { ...section, embedding };
      }));
    } catch { await store.fail(revisionId); return { ...saved, indexState: "failed" }; }

  }
  return { reindex, async save(input: CaseInput) { const saved = await store.save(input); return reindex(saved.revisionId); } };
}
