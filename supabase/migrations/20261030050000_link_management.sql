-- Case links can be removed and edited. expand_knowledge reads these links, so each change bumps knowledge_version.
create function public.unlink_cases(source uuid,target uuid,relation text) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 select workspace_id into w from public.cases where id=source; perform private.require_member(w);
 perform 1 from public.workspaces where id=w for update;
 delete from public.case_links where workspace_id=w and source_id=source and target_id=target and relation_type=relation;
 if not found then raise exception 'Resource unavailable' using errcode='42501'; end if;
 update public.workspaces set knowledge_version=knowledge_version+1 where id=w;
end $$;

-- The relation is part of the primary key, so the new relation and reason change in one statement.
create function public.update_case_link(source uuid,target uuid,relation text,new_relation text,new_reason text) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 select workspace_id into w from public.cases where id=source; perform private.require_member(w);
 perform 1 from public.workspaces where id=w for update;
 if not exists(select 1 from public.case_links where workspace_id=w and source_id=source and target_id=target and relation_type=relation) then raise exception 'Resource unavailable' using errcode='42501'; end if;
 if new_relation<>relation and exists(select 1 from public.case_links where workspace_id=w and source_id=source and target_id=target and relation_type=new_relation) then raise exception 'Link exists' using errcode='23505'; end if;
 if new_relation='supersedes' and exists(with recursive chain(id) as (select target union select l.target_id from public.case_links l join chain on chain.id=l.source_id where l.relation_type='supersedes') select 1 from chain where id=source) then raise exception 'Supersedes cycle'; end if;
 update public.case_links set relation_type=new_relation,reason=new_reason where workspace_id=w and source_id=source and target_id=target and relation_type=relation;
 update public.workspaces set knowledge_version=knowledge_version+1 where id=w;
end $$;

revoke all on function public.unlink_cases(uuid,uuid,text),public.update_case_link(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.unlink_cases(uuid,uuid,text),public.update_case_link(uuid,uuid,text,text,text) to authenticated;
