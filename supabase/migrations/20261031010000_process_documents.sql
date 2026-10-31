-- Process documents: normative text kept apart from recorded cases. A revision exists only once it is embedded and published.
create table public.documents (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces,
 lifecycle text not null default 'active' check(lifecycle in ('active','archived')),
 published_revision_id uuid,
 created_at timestamptz not null default now(), unique(id, workspace_id)
);
create table public.document_revisions (
 id uuid primary key default gen_random_uuid(), document_id uuid not null, workspace_id uuid not null,
 content jsonb not null check(jsonb_typeof(content)='object'),
 embedding_model text not null check(embedding_model in ('gemini-embedding-2','text-embedding-3-small')),
 embedding_dimensions integer not null check(embedding_dimensions=1536),
 author_id uuid not null references auth.users, created_at timestamptz not null default now(),
 foreign key(document_id,workspace_id) references public.documents(id,workspace_id), unique(id, document_id), unique(id, workspace_id)
);
alter table public.documents add foreign key(published_revision_id,id) references public.document_revisions(id,document_id);
-- summary: title, description and metadata; searchable but never disclosed or cited. body: verbatim text under its heading path.
create table public.document_sections (
 id uuid primary key default gen_random_uuid(), revision_id uuid not null, workspace_id uuid not null,
 ordinal integer not null check(ordinal>=0), kind text not null check(kind in ('summary','body')),
 block integer, heading text not null default '', heading_path text not null default '',
 content text not null check(char_length(content) between 1 and 4000),
 embedding extensions.vector(1536) not null,
 fts tsvector generated always as (to_tsvector('simple',content)) stored,
 foreign key(revision_id,workspace_id) references public.document_revisions(id,workspace_id), unique(revision_id,ordinal),
 check((kind='summary' and block is null) or (kind='body' and block>=1))
);
create index document_sections_fts on public.document_sections using gin(fts);
create index document_sections_embedding on public.document_sections using hnsw(embedding extensions.vector_cosine_ops);

create function private.immutable_document() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='document_revisions' and (new.content is distinct from old.content or new.document_id<>old.document_id or new.workspace_id<>old.workspace_id or new.author_id<>old.author_id or new.created_at<>old.created_at or new.embedding_model<>old.embedding_model or new.embedding_dimensions<>old.embedding_dimensions) then raise exception 'Immutable revision'; end if;
 if tg_table_name='document_sections' then raise exception 'Immutable section'; end if;
 return new;
end $$;
create trigger immutable_document_revision before update on public.document_revisions for each row execute function private.immutable_document();
create trigger immutable_document_section before update or delete on public.document_sections for each row execute function private.immutable_document();

do $$ declare t text; begin
 foreach t in array array['documents','document_revisions','document_sections'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy member_read on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

-- Embeddings arrive with the call, so nothing is stored until the document is ready to search. Identical content and model return 'unchanged'.
create function public.publish_document(w uuid, content jsonb, sections jsonb, model text, dimensions integer, target_document uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.documents; previous public.document_revisions; r uuid; s jsonb; n integer := 0; body text;
begin
 perform private.require_member(w);
 perform private.require_embedding_profile(model,dimensions);
 perform 1 from public.workspaces where id=w for update;
 body:=content->>'body';
 if jsonb_typeof(content)<>'object' or coalesce(length(content->>'title'),0) not between 1 and 200 or coalesce(length(content->>'description'),0) not between 1 and 600 or coalesce(length(body),0) not between 1 and 60000
   or content->>'type' not in ('policy','procedure','guideline') or content->>'area' not in ('Product','Engineering','Operations','Finance','Legal','People') or coalesce(length(content->>'owner'),0) not between 1 and 200 then raise exception 'Invalid document'; end if;
 if target_document is null then insert into public.documents(workspace_id) values(w) returning * into d;
 else
   select * into d from public.documents where id=target_document and workspace_id=w and lifecycle='active' for update;
   if not found then raise exception 'Resource unavailable' using errcode='42501'; end if;
   select * into previous from public.document_revisions where id=d.published_revision_id;
   if found and previous.content=content and previous.embedding_model=model and previous.embedding_dimensions=dimensions then return jsonb_build_object('documentId',d.id,'revisionId',previous.id,'status','unchanged'); end if;
 end if;
 if jsonb_typeof(sections) is distinct from 'array' or jsonb_array_length(sections) not between 2 and 400 then raise exception 'Invalid sections'; end if;
 for s in select jsonb_array_elements(sections) loop
   if (s->>'ordinal')::integer<>n or (n=0 and s->>'kind'<>'summary') or (n>0 and s->>'kind'<>'body') or coalesce(length(s->>'text'),0) not between 1 and 4000 then raise exception 'Section mismatch'; end if;
   if n>0 and (coalesce((s->>'block')::integer,0)<1 or strpos(body,s->>'text')=0) then raise exception 'Section mismatch'; end if;
   n:=n+1;
 end loop;
 insert into public.document_revisions(document_id,workspace_id,content,embedding_model,embedding_dimensions,author_id) values(d.id,w,content,model,dimensions,auth.uid()) returning id into r;
 for s in select jsonb_array_elements(sections) loop
   insert into public.document_sections(revision_id,workspace_id,ordinal,kind,block,heading,heading_path,content,embedding)
   values(r,w,(s->>'ordinal')::integer,s->>'kind',(s->>'block')::integer,coalesce(s->>'heading',''),coalesce(s->>'headingPath',''),s->>'text',(s->'embedding')::text::extensions.vector);
 end loop;
 update public.documents set published_revision_id=r where id=d.id;
 update public.workspaces set knowledge_version=knowledge_version+1 where id=w;
 return jsonb_build_object('documentId',d.id,'revisionId',r,'status','published');
end $$;

create function public.archive_document(d uuid) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 select workspace_id into w from public.documents where id=d; perform private.require_member(w);
 perform 1 from public.workspaces where id=w for update;
 update public.documents set lifecycle='archived' where id=d and lifecycle='active';
 if found then update public.workspaces set knowledge_version=knowledge_version+1 where id=w; end if;
end $$;
revoke all on function public.publish_document(uuid,jsonb,jsonb,text,integer,uuid),public.archive_document(uuid) from public,anon;
grant execute on function public.publish_document(uuid,jsonb,jsonb,text,integer,uuid),public.archive_document(uuid) to authenticated;

create function private.document_evidence(s public.document_sections, r public.document_revisions) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('source','document','evidenceId',s.id::text,'documentId',r.document_id,'revisionId',r.id,'sectionId',s.id,'block',s.block,'heading',coalesce(nullif(s.heading_path,''),s.heading),'documentTitle',r.content->>'title','type',r.content->>'type','area',r.content->>'area','owner',r.content->>'owner','effectiveFrom',r.content->>'effectiveFrom','excerpt',s.content,'authorId',r.author_id,'recordedAt',r.created_at,'sources',r.content->'sources');
$$;

-- One card per document: best-matching sections rank the document; summary matches count but are not disclosed.
create function public.search_knowledge_documents(w uuid, query_text text, query_embedding extensions.vector(1536), model text, max_documents integer) returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_member(w);
 perform private.require_embedding_profile(model,extensions.vector_dims(query_embedding));
 return query
 with eligible as materialized (
   select s.id,s.fts,s.embedding from public.document_sections s join public.document_revisions r on r.id=s.revision_id join public.documents d on d.id=r.document_id
   where d.workspace_id=w and d.lifecycle='active' and d.published_revision_id=r.id and r.embedding_model=model and r.embedding_dimensions=1536
 ), keyword as (
   select id,row_number() over(order by ts_rank_cd(fts,websearch_to_tsquery('simple',query_text)) desc,id) rank from eligible where fts@@websearch_to_tsquery('simple',query_text) limit 60
 ), semantic as (
   select id,row_number() over(order by embedding operator(extensions.<=>) query_embedding,id) rank from eligible where embedding operator(extensions.<=>) query_embedding<0.65 limit 60
 ), ranked as (
   select coalesce(k.id,v.id) id,coalesce(1.0/(50+k.rank),0)+coalesce(1.0/(50+v.rank),0) score from keyword k full outer join semantic v on k.id=v.id
 ), scored as (
   select ranked.score,s.revision_id,r.document_id,s.kind,s.block,coalesce(nullif(s.heading_path,''),s.heading) heading
   from ranked join public.document_sections s on s.id=ranked.id join public.document_revisions r on r.id=s.revision_id
 ), best as (
   select document_id,revision_id,max(score) score from scored group by document_id,revision_id order by max(score) desc,document_id limit greatest(1,least(max_documents,10))
 )
 select jsonb_build_object('documentId',best.document_id,'revisionId',best.revision_id,'title',rev.content->>'title','description',rev.content->>'description','type',rev.content->>'type','area',rev.content->>'area','owner',rev.content->>'owner','effectiveFrom',rev.content->>'effectiveFrom',
   'outline',(select coalesce(jsonb_agg(jsonb_build_object('block',o.block,'heading',o.heading,'chars',o.chars) order by o.block),'[]'::jsonb) from (select block,min(heading) heading,sum(char_length(content))::integer chars from public.document_sections where revision_id=best.revision_id and kind='body' group by block) o),
   'matchedHeadings',(select coalesce(jsonb_agg(jsonb_build_object('block',m.block,'heading',m.heading) order by m.score desc,m.block),'[]'::jsonb) from (select block,heading,score from (select distinct on (block) block,heading,score from scored where scored.revision_id=best.revision_id and kind='body' order by block,score desc) x order by score desc,block limit 3) m))
 from best join public.document_revisions rev on rev.id=best.revision_id order by best.score desc,best.document_id;
end $$;
-- Body sections of the requested blocks (all blocks when none are named), of one pinned revision.
create function public.read_knowledge_document(w uuid, target uuid, blocks integer[], max_results integer, revision uuid default null) returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_member(w);
 return query select private.document_evidence(s,r) from public.document_sections s join public.document_revisions r on r.id=s.revision_id join public.documents d on d.id=r.document_id
 where d.id=target and d.workspace_id=w and d.lifecycle='active' and s.kind='body' and r.id=coalesce(revision,d.published_revision_id) and (cardinality(blocks)=0 or s.block=any(blocks)) order by s.ordinal limit greatest(1,least(max_results,200));
end $$;
revoke all on function public.search_knowledge_documents(uuid,text,extensions.vector,text,integer),public.read_knowledge_document(uuid,uuid,integer[],integer,uuid) from public,anon;
grant execute on function public.search_knowledge_documents(uuid,text,extensions.vector,text,integer),public.read_knowledge_document(uuid,uuid,integer[],integer,uuid) to authenticated;

-- finish_analysis: add the document branch beside the unchanged case branch, and size the snapshot cap to both read pools (citationLimit in limits.ts).
create or replace function public.finish_analysis(run uuid, terminal text, draft jsonb, snapshots jsonb, code text, usage jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.analysis_runs; b uuid; item jsonb; claim jsonb; ref jsonb; field text; marker text;
begin
 select * into r from public.analysis_runs where id=run for update; perform private.require_member(r.workspace_id);
 if r.author_id<>auth.uid() then raise exception 'Resource unavailable' using errcode='42501'; end if;
 if r.status<>'running' then return null; end if;
 if clock_timestamp()>=r.deadline_at then terminal:='timed_out'; code:='TIMED_OUT'; end if;
 if terminal not in ('complete','gap_report','failed','cancelled','timed_out') then raise exception 'Invalid terminal'; end if;
 if terminal='complete' then
   if draft is null or jsonb_array_length(snapshots)>72 then raise exception 'Invalid brief'; end if;
   if draft->>'version'='2' then
     if r.request->>'version'<>'2' or jsonb_typeof(draft->'citations') is distinct from 'array' or jsonb_typeof(draft->'text') is distinct from 'string' then raise exception 'Invalid answer'; end if;
     for ref in select jsonb_array_elements(draft->'citations') loop
       marker:=ref->>'marker';
       if marker is null or marker !~ ('^\[S:' || r.id::text || ':[1-9][0-9]*\]$') or strpos(draft->>'text',marker)=0 then raise exception 'Invalid citation'; end if;
       if not exists(select 1 from jsonb_array_elements(snapshots) e where e->>'evidenceId'=ref->>'evidenceId') then raise exception 'Invalid citation'; end if;
       if (select count(*) from jsonb_array_elements(draft->'citations') c where c->>'marker'=marker or c->>'evidenceId'=ref->>'evidenceId')<>1 then raise exception 'Duplicate citation'; end if;
     end loop;
     if jsonb_array_length(snapshots)<>jsonb_array_length(draft->'citations') then raise exception 'Invalid citation'; end if;
     if exists(select 1 from jsonb_array_elements(snapshots) e where not exists(select 1 from jsonb_array_elements(draft->'citations') c where c->>'evidenceId'=e->>'evidenceId')) then raise exception 'Unreferenced evidence'; end if;
     if exists(select 1 from regexp_matches(draft->>'text', '\[S:[^]]+\]', 'g') m where not exists(select 1 from jsonb_array_elements(draft->'citations') c where c->>'marker'=m[1])) then raise exception 'Invalid citation'; end if;
   else
     if r.request->>'version'='2' then raise exception 'Invalid answer'; end if;
   if not draft ?& array['reusableApproach','adjustments','conflicts','unknowns','nextSteps'] then raise exception 'Invalid brief'; end if;
   foreach field in array array['reusableApproach','adjustments','conflicts','nextSteps'] loop
     if jsonb_typeof(draft->field)<>'array' then raise exception 'Invalid brief'; end if;
     for claim in select jsonb_array_elements(draft->field) loop
       if coalesce(claim->>'kind','') not in ('observed','inference','proposal') or coalesce(length(claim->>'text'),0) not between 1 and 4000 or jsonb_typeof(claim->'references') is distinct from 'array' then raise exception 'Invalid brief'; end if;
       if claim->>'kind'='observed' and jsonb_array_length(claim->'references')=0 then raise exception 'Missing citation'; end if;
       for ref in select jsonb_array_elements(claim->'references') loop
         if not exists(select 1 from jsonb_array_elements(snapshots) e where e->>'evidenceId'=ref->>'evidenceId' and e->>'caseId'=ref->>'caseId' and e->>'revisionId'=ref->>'revisionId' and e->>'sectionKey'=ref->>'sectionKey') then raise exception 'Invalid citation'; end if;
       end loop;
     end loop;
   end loop;
   end if;
   for item in select jsonb_array_elements(snapshots) loop
     if item->>'source'='document' then
       if r.request->>'version'<>'2' or not exists(select 1 from public.document_sections s join public.document_revisions rev on rev.id=s.revision_id where s.id=(item->>'sectionId')::uuid and s.revision_id=(item->>'revisionId')::uuid and rev.document_id=(item->>'documentId')::uuid and s.kind='body' and s.block=(item->>'block')::integer and s.content=item->>'excerpt' and s.workspace_id=r.workspace_id and item->>'evidenceId'=s.id::text and item->>'heading'=coalesce(nullif(s.heading_path,''),s.heading) and item->>'documentTitle'=rev.content->>'title' and item->>'type'=rev.content->>'type' and item->>'area'=rev.content->>'area' and item->>'owner'=rev.content->>'owner' and item->>'effectiveFrom'=rev.content->>'effectiveFrom' and (item->>'authorId')::uuid=rev.author_id and (item->>'recordedAt')::timestamptz=rev.created_at and item->'sources'=rev.content->'sources') then raise exception 'Invalid evidence'; end if;
     elsif not exists(select 1 from public.case_sections s join public.case_revisions rev on rev.id=s.revision_id where s.id=(item->>'sectionId')::uuid and s.revision_id=(item->>'revisionId')::uuid and rev.case_id=(item->>'caseId')::uuid and s.section_key=item->>'sectionKey' and s.content=item->>'excerpt' and s.workspace_id=r.workspace_id and rev.index_state='ready' and item->>'evidenceId'=s.id::text and item->>'caseTitle'=rev.content->>'title' and item->>'outcome'=rev.content->>'outcome' and (item->>'authorId')::uuid=rev.author_id and (item->>'recordedAt')::timestamptz=rev.created_at and item->'sources'=rev.content->'sources') then raise exception 'Invalid evidence'; end if;
   end loop;
   insert into public.briefs(workspace_id,run_id,generated,evidence,hard_constraints) values(r.workspace_id,r.id,draft,snapshots,case when r.request->>'version'='2' then '[]'::jsonb else r.request->'hardConstraints' end) returning id into b;
 end if;
 update public.analysis_runs set status=terminal,error_code=code,usage=finish_analysis.usage,finished_at=now(),events=events||jsonb_build_array(jsonb_build_object('stage','completion','state',case when terminal in ('complete','gap_report') then 'completed' else 'failed' end,'at',now(),'code',coalesce(code,''))) where id=run;
 return b;
end $$;

-- The reset removes every document of the workspace; the reseed recreates them.
create or replace function public.reset_demo_workspace(w uuid, keep_case_ids uuid[]) returns jsonb language plpgsql security definer set search_path='' as $$
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
 alter table public.document_sections disable trigger immutable_document_section;
 delete from public.document_sections where workspace_id=w; get diagnostics n=row_count; counts:=counts||jsonb_build_object('documentSections',n);
 alter table public.document_sections enable trigger immutable_document_section;
 update public.documents set published_revision_id=null where workspace_id=w;
 delete from public.document_revisions where workspace_id=w; get diagnostics n=row_count; counts:=counts||jsonb_build_object('documentRevisions',n);
 delete from public.documents where workspace_id=w; get diagnostics n=row_count; counts:=counts||jsonb_build_object('documents',n);
 update public.cases set lifecycle='active' where workspace_id=w and lifecycle='archived';
 update public.workspaces set knowledge_version=knowledge_version+1 where id=w;
 return counts;
end $$;
