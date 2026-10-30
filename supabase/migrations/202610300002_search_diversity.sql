-- Search previews spread across cases: at most per_case sections of one case, and up to 60 results.
drop function public.search_knowledge(uuid,text,extensions.vector,text,uuid[],integer,text);
create function public.search_knowledge(w uuid, query_text text, query_embedding extensions.vector(1536), purpose text, concept_ids uuid[], max_results integer, model text, per_case integer) returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_member(w);
 perform private.require_embedding_profile(model,extensions.vector_dims(query_embedding));
 return query
 with eligible as materialized (
   select s.id,s.fts,s.embedding from public.case_sections s join public.case_revisions r on r.id=s.revision_id join public.cases c on c.id=r.case_id
   where c.workspace_id=w and c.lifecycle='active' and c.published_revision_id=r.id and r.index_state='ready' and r.embedding_model=model and r.embedding_dimensions=1536
   and (cardinality(concept_ids)=0 or exists(select 1 from public.revision_concepts rc where rc.revision_id=r.id and rc.concept_id=any(concept_ids)))
 ), keyword as (
   select id,row_number() over(order by ts_rank_cd(fts,websearch_to_tsquery('simple',query_text)) desc,id) rank from eligible where fts@@websearch_to_tsquery('simple',query_text) limit greatest(1,least(max_results,60))*2
 ), semantic as (
   select id,row_number() over(order by embedding operator(extensions.<=>) query_embedding,id) rank from eligible where embedding operator(extensions.<=>) query_embedding<0.65 limit greatest(1,least(max_results,60))*2
 ), ranked as (
   select coalesce(k.id,v.id) id,coalesce(1.0/(50+k.rank),0)+coalesce(1.0/(50+v.rank),0) score from keyword k full outer join semantic v on k.id=v.id
 ), capped as (
   select ranked.id,ranked.score,row_number() over(partition by s.revision_id order by ranked.score desc,s.id) n from ranked join public.case_sections s on s.id=ranked.id
 )
 select private.evidence(s,r,c,purpose,'hybrid keyword/vector RRF') from capped join public.case_sections s on s.id=capped.id join public.case_revisions r on r.id=s.revision_id join public.cases c on c.id=r.case_id
 where capped.n<=greatest(1,least(per_case,12)) order by capped.score desc,s.id limit greatest(1,least(max_results,60));
end $$;
revoke all on function public.search_knowledge(uuid,text,extensions.vector,text,uuid[],integer,text,integer) from public,anon;
grant execute on function public.search_knowledge(uuid,text,extensions.vector,text,uuid[],integer,text,integer) to authenticated;

create or replace function public.read_knowledge_case(w uuid, target uuid, revision uuid, keys text[], max_results integer) returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_member(w);
 return query select private.evidence(s,r,c,'method','read pinned case section') from public.case_sections s join public.case_revisions r on r.id=s.revision_id join public.cases c on c.id=r.case_id
 where c.id=target and c.workspace_id=w and c.lifecycle='active' and r.index_state='ready' and r.id=coalesce(revision,c.published_revision_id) and (cardinality(keys)=0 or s.section_key=any(keys)) order by s.section_key limit greatest(1,least(max_results,60));
end $$;
