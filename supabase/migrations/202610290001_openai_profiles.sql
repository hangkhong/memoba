alter table public.case_revisions drop constraint case_revisions_embedding_model_check;
alter table public.case_revisions add constraint case_revisions_embedding_model_check
 check(embedding_model in ('gemini-embedding-2','text-embedding-3-small'));

create function private.require_embedding_profile(model text, dimensions integer) returns void
 language plpgsql immutable set search_path='' as $$
begin
 if model is null or dimensions is null or model not in ('gemini-embedding-2','text-embedding-3-small') or dimensions<>1536 then
   raise exception 'Embedding configuration mismatch' using errcode='22023';
 end if;
end $$;
revoke all on function private.require_embedding_profile(text,integer) from public;

drop function public.save_case_revision(uuid,jsonb,uuid);
create function public.save_case_revision(w uuid, input jsonb, target_case uuid default null, model text default 'gemini-embedding-2', dimensions integer default 1536) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid; r uuid; concept uuid;
begin
 perform private.require_member(w);
 perform private.require_embedding_profile(model,dimensions);
 perform 1 from public.workspaces where id=w for update;
 if input->>'template' not in ('product_delivery','cs_operations') or input->>'outcome' not in ('achieved','not_achieved','unknown') or coalesce(length(input->>'title'),0) not between 1 and 200 then raise exception 'Invalid case'; end if;
 if target_case is null then insert into public.cases(workspace_id) values(w) returning id into c;
 else select id into c from public.cases where id=target_case and workspace_id=w and lifecycle='active' for update; end if;
 if c is null then raise exception 'Resource unavailable' using errcode='42501'; end if;
 insert into public.case_revisions(case_id,workspace_id,content,author_id,embedding_model,embedding_dimensions) values(c,w,input,auth.uid(),model,dimensions) returning id into r;
 for concept in select jsonb_array_elements_text(coalesce(input->'conceptIds','[]'))::uuid loop
   insert into public.revision_concepts values(r,concept,w);
 end loop;
 update public.cases set latest_revision_id=r where id=c;
 return jsonb_build_object('caseId',c,'revisionId',r,'indexState','pending');
end $$;

create function public.prepare_case_embedding_revision(w uuid, target_case uuid, source_revision uuid, model text, dimensions integer)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.cases; source public.case_revisions; candidate public.case_revisions; r uuid;
begin
 perform private.require_member(w);
 perform private.require_embedding_profile(model,dimensions);
 perform 1 from public.workspaces where id=w for update;
 select * into c from public.cases where id=target_case and workspace_id=w and lifecycle='active' for update;
 if c.id is null then raise exception 'Resource unavailable' using errcode='42501'; end if;
 if source_revision is null or source_revision is distinct from coalesce(c.published_revision_id,c.latest_revision_id) then
   raise exception 'Embedding migration source changed' using errcode='40001';
 end if;
 select * into source from public.case_revisions where id=source_revision and case_id=c.id and workspace_id=w;
 if source.embedding_model=model and source.embedding_dimensions=dimensions then
   return jsonb_build_object('caseId',c.id,'revisionId',source.id,'indexState',source.index_state);
 end if;
 if c.latest_revision_id is distinct from source.id then
   select * into candidate from public.case_revisions where id=c.latest_revision_id;
   if candidate.content=source.content and candidate.embedding_model=model and candidate.embedding_dimensions=dimensions then
     return jsonb_build_object('caseId',c.id,'revisionId',candidate.id,'indexState',candidate.index_state);
   end if;
   raise exception 'Pending case edit blocks embedding migration' using errcode='55000';
 end if;
 insert into public.case_revisions(case_id,workspace_id,content,author_id,embedding_model,embedding_dimensions)
   values(c.id,w,source.content,auth.uid(),model,dimensions) returning id into r;
 insert into public.revision_concepts(revision_id,concept_id,workspace_id)
   select r,concept_id,w from public.revision_concepts where revision_id=source.id;
 update public.cases set latest_revision_id=r where id=c.id;
 return jsonb_build_object('caseId',c.id,'revisionId',r,'indexState','pending');
end $$;
create or replace function public.search_knowledge(w uuid, query_text text, query_embedding extensions.vector(1536), purpose text, concept_ids uuid[], max_results integer, model text) returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_member(w);
 perform private.require_embedding_profile(model,extensions.vector_dims(query_embedding));
 return query
 with eligible as materialized (
   select s.id,s.fts,s.embedding from public.case_sections s join public.case_revisions r on r.id=s.revision_id join public.cases c on c.id=r.case_id
   where c.workspace_id=w and c.lifecycle='active' and c.published_revision_id=r.id and r.index_state='ready' and r.embedding_model=model and r.embedding_dimensions=1536
   and (cardinality(concept_ids)=0 or exists(select 1 from public.revision_concepts rc where rc.revision_id=r.id and rc.concept_id=any(concept_ids)))
 ), keyword as (
   select id,row_number() over(order by ts_rank_cd(fts,websearch_to_tsquery('simple',query_text)) desc,id) rank from eligible where fts@@websearch_to_tsquery('simple',query_text) limit greatest(1,least(max_results,40))*2
 ), semantic as (
   select id,row_number() over(order by embedding operator(extensions.<=>) query_embedding,id) rank from eligible where embedding operator(extensions.<=>) query_embedding<0.65 limit greatest(1,least(max_results,40))*2
 ), ranked as (
   select coalesce(k.id,v.id) id,coalesce(1.0/(50+k.rank),0)+coalesce(1.0/(50+v.rank),0) score from keyword k full outer join semantic v on k.id=v.id
 )
 select private.evidence(s,r,c,purpose,'hybrid keyword/vector RRF') from ranked join public.case_sections s on s.id=ranked.id join public.case_revisions r on r.id=s.revision_id join public.cases c on c.id=r.case_id order by ranked.score desc,s.id limit greatest(1,least(max_results,40));
end $$;

revoke all on function public.save_case_revision(uuid,jsonb,uuid,text,integer), public.prepare_case_embedding_revision(uuid,uuid,uuid,text,integer) from public,anon;
grant execute on function public.save_case_revision(uuid,jsonb,uuid,text,integer), public.prepare_case_embedding_revision(uuid,uuid,uuid,text,integer) to authenticated;
