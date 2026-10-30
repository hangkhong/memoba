import { expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvidenceItem } from "../knowledge/contracts.ts";
import type { WorkspaceContext } from "../../lib/auth/schema.ts";
import { analysisRepository } from "./repository.ts";

const context = { userId: crypto.randomUUID(), workspaceId: crypto.randomUUID(), workspaceName: "W", knowledgeVersion: 1 } as WorkspaceContext;
function item(sectionId: string, sectionKey = "outcome"): EvidenceItem { return { sectionId, revisionId: "00000000-0000-4000-8000-0000000000aa", sectionKey } as EvidenceItem; }
function clientReturning(rows: { id: string; revision_id: string; section_key: string }[], calls: { count: number }) {
  const query = { select: () => query, eq: () => query, in: () => query, abortSignal: () => Promise.resolve({ data: rows, error: null }) };
  return { from: () => { calls.count++; return query; } } as unknown as SupabaseClient;
}
const a = "00000000-0000-4000-8000-000000000001"; const b = "00000000-0000-4000-8000-000000000002";
const row = (id: string, key = "outcome") => ({ id, revision_id: "00000000-0000-4000-8000-0000000000aa", section_key: key });

it("checks all cited sections with one query and fails when any is unreadable", async () => {
  const calls = { count: 0 };
  const repo = analysisRepository(clientReturning([row(a), row(b)], calls) as never, context);
  expect(await repo.canReadAll([item(a), item(b)])).toBe(true);
  expect(calls.count).toBe(1);
  expect(await analysisRepository(clientReturning([row(a)], { count: 0 }) as never, context).canReadAll([item(a), item(b)])).toBe(false);
  expect(await analysisRepository(clientReturning([row(a, "context")], { count: 0 }) as never, context).canReadAll([item(a)])).toBe(false);
  expect(await repo.canReadAll([])).toBe(true);
});
