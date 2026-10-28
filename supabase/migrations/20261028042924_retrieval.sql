create function private.evidence(s public.case_sections, r public.case_revisions, c public.cases, purpose text, reason text) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('evidenceId',s.id::text,'caseId',c.id,'revisionId',r.id,'sectionId',s.id,'sectionKey',s.section_key,'caseTitle',r.content->>'title','excerpt',s.content,'outcome',r.content->>'outcome','authorId',r.author_id,'recordedAt',r.created_at,'sources',r.content->'sources','purpose',purpose,'retrievalReason',reason);
$$;
create function public.search_knowledge(w uuid, query_text text, query_embedding extensions.vector(1536), purpose text, concept_ids uuid[], max_results integer, model text) returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_member(w);
 if model<>'gemini-embedding-2' or extensions.vector_dims(query_embedding)<>1536 then raise exception 'Embedding configuration mismatch'; end if;
 return query
 with eligible as materialized (
   select s.id,s.fts,s.embedding from public.case_sections s join public.case_revisions r on r.id=s.revision_id join public.cases c on c.id=r.case_id
   where c.workspace_id=w and c.lifecycle='active' and c.published_revision_id=r.id and r.index_state='ready'
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
create function public.read_knowledge_case(w uuid, target uuid, revision uuid, keys text[], max_results integer) returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_member(w);
 return query select private.evidence(s,r,c,'method','read pinned case section') from public.case_sections s join public.case_revisions r on r.id=s.revision_id join public.cases c on c.id=r.case_id
 where c.id=target and c.workspace_id=w and c.lifecycle='active' and r.index_state='ready' and r.id=coalesce(revision,c.published_revision_id) and (cardinality(keys)=0 or s.section_key=any(keys)) order by s.section_key limit greatest(1,least(max_results,40));
end $$;
create function public.expand_knowledge(w uuid, seeds uuid[], relations text[], max_results integer) returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_member(w);
 if cardinality(seeds)>40 or exists(select 1 from unnest(seeds) seed where not exists(select 1 from public.cases where id=seed and workspace_id=w and lifecycle='active' and published_revision_id is not null)) then raise exception 'Invalid seed' using errcode='42501'; end if;
 return query with targets as (
 select case when l.source_id=any(seeds) then l.target_id else l.source_id end id from public.case_links l where l.workspace_id=w and l.relation_type=any(relations) and (l.source_id=any(seeds) or l.target_id=any(seeds))
 union
 select other.case_id from public.cases seed join public.revision_concepts sc on sc.revision_id=seed.published_revision_id join public.revision_concepts oc on oc.concept_id=sc.concept_id join public.case_revisions other on other.id=oc.revision_id join public.cases current_target on current_target.id=other.case_id and current_target.published_revision_id=other.id where seed.id=any(seeds) and seed.workspace_id=w and other.workspace_id=w
 )
 select private.evidence(s,r,c,'conditions','one-hop shared concept/direct link') from targets join public.cases c on c.id=targets.id join public.case_revisions r on r.id=c.published_revision_id join public.case_sections s on s.revision_id=r.id
 where c.workspace_id=w and c.lifecycle='active' and not c.id=any(seeds) and r.index_state='ready'
 order by (r.content->>'outcome'='not_achieved') desc,case when s.section_key in ('lessons','constraints','approach') then 0 else 1 end,s.id limit greatest(1,least(max_results,40));
end $$;
revoke all on function public.search_knowledge(uuid,text,extensions.vector,text,uuid[],integer,text),public.read_knowledge_case(uuid,uuid,uuid,text[],integer),public.expand_knowledge(uuid,uuid[],text[],integer) from public,anon;
grant execute on function public.search_knowledge(uuid,text,extensions.vector,text,uuid[],integer,text),public.read_knowledge_case(uuid,uuid,uuid,text[],integer),public.expand_knowledge(uuid,uuid[],text[],integer) to authenticated;
