import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { WorkspaceContext } from "@/lib/auth/schema";
import { documentContentSchema, savedDocumentSchema } from "./schema.ts";
import type { DocumentStore } from "./service";

export const documentRecordSchema = z.object({ id: z.uuid(), lifecycle: z.enum(["active", "archived"]), published_revision_id: z.uuid().nullable(), created_at: z.iso.datetime({ offset: true }) });
export const documentRevisionSchema = z.object({ id: z.uuid(), document_id: z.uuid(), content: documentContentSchema, created_at: z.iso.datetime({ offset: true }) });
export type DocumentRecord = z.infer<typeof documentRecordSchema>;
export type DocumentRevision = z.infer<typeof documentRevisionSchema>;

export function documentRepository(client: SupabaseClient<Database>, context: Pick<WorkspaceContext, "workspaceId">, config: { embeddingModel: string; dimensions: number }): DocumentStore {
  return {
    async current(documentId) {
      const record = await client.from("documents").select("published_revision_id").eq("workspace_id", context.workspaceId).eq("id", documentId).eq("lifecycle", "active").maybeSingle();
      if (record.error) throw new Error("DOCUMENT_UNAVAILABLE");
      const revisionId = z.object({ published_revision_id: z.uuid().nullable() }).nullable().parse(record.data)?.published_revision_id;
      if (!revisionId) return null;
      const revision = await client.from("document_revisions").select("id,content,embedding_model,embedding_dimensions").eq("workspace_id", context.workspaceId).eq("id", revisionId).single();
      if (revision.error) throw new Error("DOCUMENT_UNAVAILABLE");
      const parsed = z.object({ id: z.uuid(), content: documentContentSchema, embedding_model: z.string(), embedding_dimensions: z.number().int() }).parse(revision.data);
      return { revisionId: parsed.id, content: parsed.content, embeddingModel: parsed.embedding_model, dimensions: parsed.embedding_dimensions };
    },
    async publish({ documentId, content, sections }) {
      const result = await client.rpc("publish_document", { w: context.workspaceId, target_document: documentId ?? undefined, content, sections, model: config.embeddingModel, dimensions: config.dimensions });
      if (result.error) throw new Error("DOCUMENT_PUBLISH_FAILED");
      return savedDocumentSchema.parse(result.data);
    },
  };
}
export async function listDocuments(client: SupabaseClient<Database>, context: WorkspaceContext) {
  const documents = await client.from("documents").select("*").eq("workspace_id", context.workspaceId).order("created_at", { ascending: false });
  if (documents.error) throw new Error("DOCUMENT_LIST_FAILED");
  const records = z.array(documentRecordSchema).parse(documents.data);
  const ids = records.flatMap((record) => record.published_revision_id ? [record.published_revision_id] : []);
  const revisions = ids.length ? await client.from("document_revisions").select("id,document_id,content,created_at").eq("workspace_id", context.workspaceId).in("id", ids) : { data: [], error: null };
  if (revisions.error) throw new Error("DOCUMENT_LIST_FAILED");
  const parsed = z.array(documentRevisionSchema).parse(revisions.data);
  return records.map((record) => ({ ...record, revision: parsed.find((revision) => revision.id === record.published_revision_id) }));
}
export async function documentDetail(client: SupabaseClient<Database>, context: WorkspaceContext, id: string) {
  const result = await client.from("documents").select("*").eq("workspace_id", context.workspaceId).eq("id", id).maybeSingle();
  if (result.error || !result.data) return null;
  const record = documentRecordSchema.parse(result.data);
  const revisions = await client.from("document_revisions").select("id,document_id,content,created_at").eq("document_id", id).eq("workspace_id", context.workspaceId).order("created_at", { ascending: false });
  if (revisions.error) throw new Error("DOCUMENT_DETAIL_FAILED");
  return { ...record, revisions: z.array(documentRevisionSchema).parse(revisions.data) };
}
