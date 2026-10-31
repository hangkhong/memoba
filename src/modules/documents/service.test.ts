import { expect, it } from "vitest";
import { createDocumentService, type DocumentStore } from "./service";
import { documentFormSchema, type DocumentInput } from "./schema";

const content: DocumentInput = { title: "Release", description: "When to release.", body: "## Steps\n\nDo it.\n\n## Rollback\n\nUndo it.", type: "procedure", area: "Engineering", owner: "Platform", effectiveFrom: "2026-01-01", sources: [] };
const profile = { embeddingModel: "text-embedding-3-small", dimensions: 1536 };
const embed = async ({ texts }: { texts: string[] }) => ({ kind: "success" as const, vectors: texts.map(() => [1]), tokens: 1 });
function harness(current: Awaited<ReturnType<DocumentStore["current"]>> = null) {
  const published: Parameters<DocumentStore["publish"]>[0][] = [];
  let embedded = 0;
  const store: DocumentStore = { current: async () => current, publish: async (args) => { published.push(args); return { documentId: args.documentId ?? "00000000-0000-4000-8000-000000000001", revisionId: "00000000-0000-4000-8000-000000000002", version: (current?.version ?? 0) + 1, status: "published" }; } };
  return { published, embedded: () => embedded, service: createDocumentService(store, async (args) => { embedded++; return embed(args); }, profile) };
}

it("publishes a first version without a note and lets the database default it", async () => {
  const { service, published } = harness();
  expect(await service.save(content)).toMatchObject({ kind: "saved", saved: { status: "published", version: 1 } });
  expect(published[0]).toMatchObject({ documentId: null, changeNote: null });
  expect(published[0]?.sections[0]).toMatchObject({ ordinal: 0, kind: "summary" });
  expect(published[0]?.content).not.toHaveProperty("changeNote");
});

it("requires a change note for a new version and passes it on, apart from the content", async () => {
  const current = { revisionId: "00000000-0000-4000-8000-000000000009", version: 3, content, embeddingModel: profile.embeddingModel, dimensions: profile.dimensions };
  const { service, published } = harness(current);
  expect(await service.save({ ...content, owner: "Ops" }, "00000000-0000-4000-8000-000000000001")).toEqual({ kind: "invalid", errors: ["Describe what changed and why."] });
  expect(published).toHaveLength(0);
  expect(await service.save({ ...content, owner: "Ops", changeNote: "  Owner moved to Ops.  " }, "00000000-0000-4000-8000-000000000001")).toMatchObject({ kind: "saved", saved: { version: 4 } });
  expect(published[0]).toMatchObject({ changeNote: "Owner moved to Ops." });
});

it("returns the current version for identical content without embedding or a note", async () => {
  const current = { revisionId: "00000000-0000-4000-8000-000000000009", version: 3, content, embeddingModel: profile.embeddingModel, dimensions: profile.dimensions };
  const { service, published, embedded } = harness(current);
  expect(await service.save({ ...content }, "00000000-0000-4000-8000-000000000001")).toEqual({ kind: "saved", saved: { documentId: "00000000-0000-4000-8000-000000000001", revisionId: current.revisionId, version: 3, status: "unchanged" } });
  expect(embedded()).toBe(0); expect(published).toHaveLength(0);
});

it("rejects a future effective date in the schema and the form", async () => {
  const future = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
  const { service } = harness();
  expect(await service.save({ ...content, effectiveFrom: future })).toMatchObject({ kind: "invalid", errors: [expect.stringContaining("cannot be in the future")] });
  expect(documentFormSchema(false).safeParse({ ...content, effectiveFrom: future }).success).toBe(false);
  expect(documentFormSchema(true).safeParse({ ...content, changeNote: "" }).error?.issues.map((issue) => issue.path[0])).toEqual(["changeNote"]);
  expect(documentFormSchema(true).safeParse({ ...content, changeNote: "Fixed a date." }).success).toBe(true);
});
