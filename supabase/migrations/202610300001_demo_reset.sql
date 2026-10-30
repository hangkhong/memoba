-- Restores the shared demo workspace: removes visitor cases, conversations, runs and briefs.
-- Callable only with the service role, from the demo:reset script.
create function public.reset_demo_workspace(w uuid, keep_case_ids uuid[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare removed uuid[]; counts jsonb := '{}'::jsonb; n bigint;
begin
 perform 1 from public.workspaces where id=w for update;
 if not found then raise exception 'Unknown workspace' using errcode='P0002'; end if;
 select coalesce(array_agg(id),'{}') into removed from public.cases where workspace_id=w and id <> all(coalesce(keep_case_ids,'{}'));
 delete from public.briefs where workspace_id=w; get diagnostics n=row_count; counts:=counts||jsonb_build_object('briefs',n);
 delete from public.analysis_runs where workspace_id=w; get diagnostics n=row_count; counts:=counts||jsonb_build_object('runs',n);
 alter table public.conversation_turns disable trigger immutable_turn;
 delete from public.conversation_turns where workspace_id=w; get diagnostics n=row_count; counts:=counts||jsonb_build_object('turns',n);
 alter table public.conversation_turns enable trigger immutable_turn;
 delete from public.conversations where workspace_id=w; get diagnostics n=row_count; counts:=counts||jsonb_build_object('conversations',n);
 delete from public.case_links where workspace_id=w and (source_id=any(removed) or target_id=any(removed)); get diagnostics n=row_count; counts:=counts||jsonb_build_object('links',n);
 delete from public.revision_concepts where workspace_id=w and revision_id in (select id from public.case_revisions where case_id=any(removed));
 alter table public.case_sections disable trigger immutable_section;
 delete from public.case_sections where workspace_id=w and revision_id in (select id from public.case_revisions where case_id=any(removed)); get diagnostics n=row_count; counts:=counts||jsonb_build_object('sections',n);
 alter table public.case_sections enable trigger immutable_section;
 update public.cases set published_revision_id=null, latest_revision_id=null where id=any(removed);
 delete from public.case_revisions where case_id=any(removed); get diagnostics n=row_count; counts:=counts||jsonb_build_object('revisions',n);
 delete from public.cases where id=any(removed); get diagnostics n=row_count; counts:=counts||jsonb_build_object('cases',n);
 update public.cases set lifecycle='active' where workspace_id=w and lifecycle='archived';
 update public.workspaces set knowledge_version=knowledge_version+1 where id=w;
 return counts;
end $$;
revoke all on function public.reset_demo_workspace(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reset_demo_workspace(uuid, uuid[]) to service_role;
