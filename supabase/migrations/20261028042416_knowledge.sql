-- Model and dimension verified by the direct Gemini probe on 2026-10-28.
create schema if not exists private;
revoke all on schema private from public;
create function private.require_member(w uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_workspace_member(w) then raise exception 'Resource unavailable' using errcode='42501'; end if;
end $$;

create table public.cases (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces,
 lifecycle text not null default 'active' check(lifecycle in ('active','archived')),
 published_revision_id uuid, latest_revision_id uuid,
 created_at timestamptz not null default now(), unique(id, workspace_id)
);
create table public.case_revisions (
 id uuid primary key default gen_random_uuid(), case_id uuid not null, workspace_id uuid not null,
 content jsonb not null check(jsonb_typeof(content)='object'),
 index_state text not null default 'pending' check(index_state in ('pending','failed','ready')),
 embedding_model text not null default 'gemini-embedding-2' check(embedding_model='gemini-embedding-2'),
 embedding_dimensions integer not null default 1536 check(embedding_dimensions=1536),
 author_id uuid not null references auth.users, created_at timestamptz not null default now(),
 foreign key(case_id,workspace_id) references public.cases(id,workspace_id), unique(id,case_id), unique(id,workspace_id)
);
alter table public.cases add foreign key(published_revision_id,id) references public.case_revisions(id,case_id);
alter table public.cases add foreign key(latest_revision_id,id) references public.case_revisions(id,case_id);
create table public.case_sections (
 id uuid primary key default gen_random_uuid(), revision_id uuid not null, workspace_id uuid not null,
 section_key text not null check(section_key in ('problem','context','constraints','approach','observedOutcome','lessons','deliverable','changeScope','deploymentConditions','customerImpact','handlingConditions','escalationNotes')),
 content text not null check(char_length(content) between 1 and 4000),
 embedding extensions.vector(1536) not null,
 fts tsvector generated always as (to_tsvector('simple',content)) stored,
 foreign key(revision_id,workspace_id) references public.case_revisions(id,workspace_id), unique(revision_id,section_key)
);
create index case_sections_fts on public.case_sections using gin(fts);
create index case_sections_embedding on public.case_sections using hnsw(embedding extensions.vector_cosine_ops);
create table public.concepts (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces,
 kind text not null check(kind in ('problem_type','system','approach','constraint')),
 label text not null, aliases text[] not null default '{}', unique(id,workspace_id), unique(workspace_id,kind,label)
);
create table public.revision_concepts (
 revision_id uuid not null, concept_id uuid not null, workspace_id uuid not null,
 foreign key(revision_id,workspace_id) references public.case_revisions(id,workspace_id),
 foreign key(concept_id,workspace_id) references public.concepts(id,workspace_id), primary key(revision_id,concept_id)
);
create table public.case_links (
 source_id uuid not null, target_id uuid not null, workspace_id uuid not null,
 relation_type text not null check(relation_type in ('related_to','contrasts_with','supersedes')),
 reason text not null check(char_length(reason) between 1 and 4000),
 foreign key(source_id,workspace_id) references public.cases(id,workspace_id),
 foreign key(target_id,workspace_id) references public.cases(id,workspace_id),
 check(source_id<>target_id), primary key(source_id,target_id,relation_type)
);
create function private.immutable_content() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='case_revisions' and (new.content is distinct from old.content or new.case_id<>old.case_id or new.workspace_id<>old.workspace_id or new.author_id<>old.author_id or new.created_at<>old.created_at or new.embedding_model<>old.embedding_model or new.embedding_dimensions<>old.embedding_dimensions) then raise exception 'Immutable revision'; end if;
 if tg_table_name='case_sections' then raise exception 'Immutable section'; end if;
 return new;
end $$;
create trigger immutable_revision before update on public.case_revisions for each row execute function private.immutable_content();
create trigger immutable_section before update or delete on public.case_sections for each row execute function private.immutable_content();

create function public.save_case_revision(w uuid, input jsonb, target_case uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid; r uuid; concept uuid;
begin
 perform private.require_member(w);
 if input->>'template' not in ('product_delivery','cs_operations') or input->>'outcome' not in ('achieved','not_achieved','unknown') or coalesce(length(input->>'title'),0) not between 1 and 200 then raise exception 'Invalid case'; end if;
 if target_case is null then insert into public.cases(workspace_id) values(w) returning id into c;
 else select id into c from public.cases where id=target_case and workspace_id=w and lifecycle='active' for update; end if;
 if c is null then raise exception 'Resource unavailable' using errcode='42501'; end if;
 insert into public.case_revisions(case_id,workspace_id,content,author_id) values(c,w,input,auth.uid()) returning id into r;
 for concept in select jsonb_array_elements_text(coalesce(input->'conceptIds','[]'))::uuid loop
   insert into public.revision_concepts values(r,concept,w);
 end loop;
 update public.cases set latest_revision_id=r where id=c;
 return jsonb_build_object('caseId',c,'revisionId',r,'indexState','pending');
end $$;
create function public.publish_case_revision(r uuid, sections jsonb, model text, dimensions integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare rev public.case_revisions; c public.cases; s jsonb; key text; expected text[];
begin
 select * into rev from public.case_revisions where id=r;
 perform private.require_member(rev.workspace_id);
 perform 1 from public.workspaces where id=rev.workspace_id for update;
 select * into rev from public.case_revisions where id=r for update;
 select * into c from public.cases where id=rev.case_id for update;
 if c.lifecycle<>'active' then raise exception 'Archived case'; end if;
 if rev.index_state='ready' then return jsonb_build_object('caseId',c.id,'revisionId',r,'indexState','ready'); end if;
 if model<>rev.embedding_model or dimensions<>rev.embedding_dimensions then raise exception 'Embedding configuration mismatch'; end if;
 expected:=array['problem','context','constraints','approach','observedOutcome','lessons'] || case when rev.content->>'template'='product_delivery' then array['deliverable','changeScope','deploymentConditions'] else array['customerImpact','handlingConditions','escalationNotes'] end;
 if jsonb_array_length(sections)<>cardinality(expected) then raise exception 'Incomplete index'; end if;
 for s in select jsonb_array_elements(sections) loop
   key:=s->>'key';
   if not key=any(expected) or s->>'text' is distinct from rev.content->>key then raise exception 'Section mismatch'; end if;
   insert into public.case_sections(revision_id,workspace_id,section_key,content,embedding) values(r,rev.workspace_id,key,s->>'text',(s->'embedding')::text::extensions.vector);
 end loop;
 update public.case_revisions set index_state='ready' where id=r;
 if c.latest_revision_id=r then
   update public.cases set published_revision_id=r where id=c.id;
   update public.workspaces set knowledge_version=knowledge_version+1 where id=rev.workspace_id;
 end if;
 return jsonb_build_object('caseId',c.id,'revisionId',r,'indexState','ready');
end $$;
create function public.fail_case_index(r uuid) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 select workspace_id into w from public.case_revisions where id=r; perform private.require_member(w);
 update public.case_revisions set index_state='failed' where id=r and index_state<>'ready';
end $$;
create function public.archive_case(c uuid) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 select workspace_id into w from public.cases where id=c; perform private.require_member(w);
 perform 1 from public.workspaces where id=w for update;
 update public.cases set lifecycle='archived' where id=c and lifecycle='active';
 if found then update public.workspaces set knowledge_version=knowledge_version+1 where id=w; end if;
end $$;
create function public.link_cases(source uuid,target uuid,relation text,reason text,archive_target boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 select workspace_id into w from public.cases where id=source; perform private.require_member(w);
 perform 1 from public.workspaces where id=w for update;
 if not exists(select 1 from public.cases where id=target and workspace_id=w) then raise exception 'Resource unavailable' using errcode='42501'; end if;
 if relation='supersedes' and exists(with recursive chain(id) as (select target union select l.target_id from public.case_links l join chain on chain.id=l.source_id where l.relation_type='supersedes') select 1 from chain where id=source) then raise exception 'Supersedes cycle'; end if;
 if archive_target and relation<>'supersedes' then raise exception 'Archive requires supersedes'; end if;
 insert into public.case_links values(source,target,w,relation,reason) on conflict(source_id,target_id,relation_type) do update set reason=excluded.reason;
 if archive_target then perform public.archive_case(target); end if;
 update public.workspaces set knowledge_version=knowledge_version+1 where id=w;
end $$;

do $$ declare t text; begin
 foreach t in array array['cases','case_revisions','case_sections','concepts','revision_concepts','case_links'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy member_read on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke all on function public.save_case_revision(uuid,jsonb,uuid),public.publish_case_revision(uuid,jsonb,text,integer),public.fail_case_index(uuid),public.archive_case(uuid),public.link_cases(uuid,uuid,text,text,boolean) from public,anon;
grant execute on function public.save_case_revision(uuid,jsonb,uuid),public.publish_case_revision(uuid,jsonb,text,integer),public.fail_case_index(uuid),public.archive_case(uuid),public.link_cases(uuid,uuid,text,text,boolean) to authenticated;
