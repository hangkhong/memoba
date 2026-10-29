
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "analysis_runs": {
                  Row: {
                    "author_id": string,"conversation_turn_id": string | null,"created_at": string,"deadline_at": string,"error_code": string | null,"events": NonNullable<Json>,"finished_at": string | null,"id": string,"knowledge_version": number,"request": NonNullable<Json>,"request_key": string,"status": string,"usage": Json | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"conversation_turn_id"?: string | null,"created_at"?: string,"deadline_at": string,"error_code"?: string | null,"events"?: NonNullable<Json>,"finished_at"?: string | null,"id"?: string,"knowledge_version": number,"request": NonNullable<Json>,"request_key": string,"status"?: string,"usage"?: Json | null,"workspace_id": string
                  }
                  Update: {
                    "author_id"?: string,"conversation_turn_id"?: string | null,"created_at"?: string,"deadline_at"?: string,"error_code"?: string | null,"events"?: NonNullable<Json>,"finished_at"?: string | null,"id"?: string,"knowledge_version"?: number,"request"?: NonNullable<Json>,"request_key"?: string,"status"?: string,"usage"?: Json | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "analysis_runs_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "run_conversation_turn"
      columns: ["conversation_turn_id","workspace_id"]
isOneToOne: false
      referencedRelation: "conversation_turns"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"briefs": {
                  Row: {
                    "created_at": string,"edited_at": string | null,"edited_text": string | null,"evidence": NonNullable<Json>,"generated": NonNullable<Json>,"hard_constraints": NonNullable<Json>,"id": string,"run_id": string,"saved": boolean,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"edited_at"?: string | null,"edited_text"?: string | null,"evidence": NonNullable<Json>,"generated": NonNullable<Json>,"hard_constraints": NonNullable<Json>,"id"?: string,"run_id": string,"saved"?: boolean,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"edited_at"?: string | null,"edited_text"?: string | null,"evidence"?: NonNullable<Json>,"generated"?: NonNullable<Json>,"hard_constraints"?: NonNullable<Json>,"id"?: string,"run_id"?: string,"saved"?: boolean,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "briefs_run_id_workspace_id_fkey"
      columns: ["run_id","workspace_id"]
isOneToOne: false
      referencedRelation: "analysis_runs"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "briefs_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"case_links": {
                  Row: {
                    "reason": string,"relation_type": string,"source_id": string,"target_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "reason": string,"relation_type": string,"source_id": string,"target_id": string,"workspace_id": string
                  }
                  Update: {
                    "reason"?: string,"relation_type"?: string,"source_id"?: string,"target_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "case_links_source_id_workspace_id_fkey"
      columns: ["source_id","workspace_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "case_links_target_id_workspace_id_fkey"
      columns: ["target_id","workspace_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"case_revisions": {
                  Row: {
                    "author_id": string,"case_id": string,"content": NonNullable<Json>,"created_at": string,"embedding_dimensions": number,"embedding_model": string,"id": string,"index_state": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"case_id": string,"content": NonNullable<Json>,"created_at"?: string,"embedding_dimensions"?: number,"embedding_model"?: string,"id"?: string,"index_state"?: string,"workspace_id": string
                  }
                  Update: {
                    "author_id"?: string,"case_id"?: string,"content"?: NonNullable<Json>,"created_at"?: string,"embedding_dimensions"?: number,"embedding_model"?: string,"id"?: string,"index_state"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "case_revisions_case_id_workspace_id_fkey"
      columns: ["case_id","workspace_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"case_sections": {
                  Row: {
                    "content": string,"embedding": string,"fts": unknown,"id": string,"revision_id": string,"section_key": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"embedding": string,"fts"?: never,"id"?: string,"revision_id": string,"section_key": string,"workspace_id": string
                  }
                  Update: {
                    "content"?: string,"embedding"?: string,"fts"?: never,"id"?: string,"revision_id"?: string,"section_key"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "case_sections_revision_id_workspace_id_fkey"
      columns: ["revision_id","workspace_id"]
isOneToOne: false
      referencedRelation: "case_revisions"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"cases": {
                  Row: {
                    "created_at": string,"id": string,"latest_revision_id": string | null,"lifecycle": string,"published_revision_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"latest_revision_id"?: string | null,"lifecycle"?: string,"published_revision_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"latest_revision_id"?: string | null,"lifecycle"?: string,"published_revision_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cases_latest_revision_id_id_fkey"
      columns: ["latest_revision_id","id"]
isOneToOne: false
      referencedRelation: "case_revisions"
      referencedColumns: ["id","case_id"]
    },{
      foreignKeyName: "cases_published_revision_id_id_fkey"
      columns: ["published_revision_id","id"]
isOneToOne: false
      referencedRelation: "case_revisions"
      referencedColumns: ["id","case_id"]
    },{
      foreignKeyName: "cases_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"concepts": {
                  Row: {
                    "aliases": (string)[],"id": string,"kind": string,"label": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aliases"?: (string)[],"id"?: string,"kind": string,"label": string,"workspace_id": string
                  }
                  Update: {
                    "aliases"?: (string)[],"id"?: string,"kind"?: string,"label"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "concepts_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"conversation_turns": {
                  Row: {
                    "conversation_id": string,"created_at": string,"id": string,"message": string,"parent_turn_id": string | null,"position": number,"request": NonNullable<Json>,"request_key": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"created_at"?: string,"id"?: string,"message": string,"parent_turn_id"?: string | null,"position": number,"request": NonNullable<Json>,"request_key": string,"workspace_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"created_at"?: string,"id"?: string,"message"?: string,"parent_turn_id"?: string | null,"position"?: number,"request"?: NonNullable<Json>,"request_key"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_turns_conversation_id_workspace_id_fkey"
      columns: ["conversation_id","workspace_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "conversation_turns_parent_turn_id_conversation_id_fkey"
      columns: ["parent_turn_id","conversation_id"]
isOneToOne: false
      referencedRelation: "conversation_turns"
      referencedColumns: ["id","conversation_id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "author_id": string,"created_at": string,"id": string,"title": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"created_at"?: string,"id": string,"title"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "author_id"?: string,"created_at"?: string,"id"?: string,"title"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"revision_concepts": {
                  Row: {
                    "concept_id": string,"revision_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "concept_id": string,"revision_id": string,"workspace_id": string
                  }
                  Update: {
                    "concept_id"?: string,"revision_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "revision_concepts_concept_id_workspace_id_fkey"
      columns: ["concept_id","workspace_id"]
isOneToOne: false
      referencedRelation: "concepts"
      referencedColumns: ["id","workspace_id"]
    },{
      foreignKeyName: "revision_concepts_revision_id_workspace_id_fkey"
      columns: ["revision_id","workspace_id"]
isOneToOne: false
      referencedRelation: "case_revisions"
      referencedColumns: ["id","workspace_id"]
    }
                  ]
                },"workspace_members": {
                  Row: {
                    "created_at": string,"role": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role"?: string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "created_at": string,"id": string,"knowledge_version": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"knowledge_version"?: number,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"knowledge_version"?: number,"name"?: string
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admit_analysis":
{ Args: { "cutoff_at"?: string,"deadline_ms": number,"input": Json,"max_concurrent": number,"request_key": string,"w": string }; Returns: Json
                           },
"admit_conversation_analysis":
{ Args: { "cutoff_at"?: string,"deadline_ms": number,"max_concurrent": number,"request_key": string,"turn": string }; Returns: Json
                           },
"append_analysis_event":
{ Args: { "event": Json,"run": string }; Returns: undefined
                           },
"archive_case":
{ Args: { "c": string }; Returns: undefined
                           },
"create_conversation":
{ Args: { "conversation": string,"w": string }; Returns: string
                           },
"edit_brief":
{ Args: { "brief": string,"save_value": boolean,"text_value": string }; Returns: undefined
                           },
"expand_knowledge":
{ Args: { "max_results": number,"relations": (string)[],"seeds": (string)[],"w": string }; Returns: Json[]
                           },
"fail_case_index":
{ Args: { "r": string }; Returns: undefined
                           },
"finish_analysis":
{ Args: { "code": string,"draft": Json,"run": string,"snapshots": Json,"terminal": string,"usage": Json }; Returns: string
                           },
"is_workspace_member":
{ Args: { "target_workspace_id": string }; Returns: boolean
                           },
"link_cases":
{ Args: { "archive_target"?: boolean,"reason": string,"relation": string,"source": string,"target": string }; Returns: undefined
                           },
"prepare_case_embedding_revision":
{ Args: { "dimensions": number,"model": string,"source_revision": string,"target_case": string,"w": string }; Returns: Json
                           },
"publish_case_revision":
{ Args: { "dimensions": number,"model": string,"r": string,"sections": Json }; Returns: Json
                           },
"read_knowledge_case":
{ Args: { "keys": (string)[],"max_results": number,"revision": string,"target": string,"w": string }; Returns: Json[]
                           },
"reconcile_analysis":
{ Args: { "run": string }; Returns: undefined
                           },
"save_case_revision":
{ Args: { "dimensions"?: number,"input": Json,"model"?: string,"target_case"?: string,"w": string }; Returns: Json
                           },
"save_conversation_turn":
{ Args: { "body": string,"conversation": string,"input": Json,"key": string,"parent"?: string }; Returns: string
                           },
"search_knowledge":
{ Args: { "concept_ids": (string)[],"max_results": number,"model": string,"purpose": string,"query_embedding": string,"query_text": string,"w": string }; Returns: Json[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"public": {
          Enums: {

          }
        }
} as const
