create table public.analysis_runs (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces,
 author_id uuid not null references auth.users, request_key uuid not null, request jsonb not null,
 knowledge_version bigint not null,
 status text not null default 'running' check(status in ('running','complete','gap_report','failed','cancelled','timed_out')),
 deadline_at timestamptz not null, created_at timestamptz not null default now(), finished_at timestamptz,
 events jsonb not null default '[]', error_code text, usage jsonb,
 unique(workspace_id,author_id,request_key), unique(id,workspace_id)
);
create table public.briefs (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces,
 run_id uuid not null unique, generated jsonb not null, evidence jsonb not null, hard_constraints jsonb not null,
 edited_text text check(char_length(edited_text)<=20000), edited_at timestamptz, saved boolean not null default false,
 created_at timestamptz not null default now(),
 foreign key(run_id,workspace_id) references public.analysis_runs(id,workspace_id)
);
create function public.admit_analysis(w uuid, input jsonb, request_key uuid, max_concurrent integer, deadline_ms integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.analysis_runs; version bigint;
begin
 perform private.require_member(w);
 select knowledge_version into version from public.workspaces where id=w for update;
 update public.analysis_runs set status='timed_out',error_code='TIMED_OUT',finished_at=now() where workspace_id=w and status='running' and deadline_at<=now();
 select * into r from public.analysis_runs where workspace_id=w and author_id=auth.uid() and analysis_runs.request_key=admit_analysis.request_key;
 if found then return jsonb_build_object('kind','duplicate','runId',r.id); end if;
 if (select count(*) from public.analysis_runs where workspace_id=w and status='running')>=greatest(1,least(max_concurrent,2)) then return jsonb_build_object('kind','quota'); end if;
 insert into public.analysis_runs(workspace_id,author_id,request_key,request,knowledge_version,deadline_at) values(w,auth.uid(),request_key,input,version,now()+make_interval(secs=>greatest(1,least(deadline_ms,90000))/1000.0)) returning * into r;
 return jsonb_build_object('kind','admitted','runId',r.id,'deadlineAt',r.deadline_at);
end $$;
create function public.append_analysis_event(run uuid,event jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r public.analysis_runs;
begin
 select * into r from public.analysis_runs where id=run; perform private.require_member(r.workspace_id);
 if r.author_id<>auth.uid() then raise exception 'Resource unavailable' using errcode='42501'; end if;
 update public.analysis_runs set events=events||jsonb_build_array(event) where id=run and status='running' and jsonb_array_length(events)<128;
end $$;
create function public.finish_analysis(run uuid, terminal text, draft jsonb, snapshots jsonb, code text, usage jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.analysis_runs; b uuid; item jsonb; claim jsonb; ref jsonb; field text;
begin
 select * into r from public.analysis_runs where id=run for update; perform private.require_member(r.workspace_id);
 if r.author_id<>auth.uid() then raise exception 'Resource unavailable' using errcode='42501'; end if;
 if r.status<>'running' then return null; end if;
 if now()>=r.deadline_at then terminal:='timed_out'; code:='TIMED_OUT'; end if;
 if terminal not in ('complete','gap_report','failed','cancelled','timed_out') then raise exception 'Invalid terminal'; end if;
 if terminal='complete' then
   if draft is null or jsonb_array_length(snapshots)>40 then raise exception 'Invalid brief'; end if;
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
   for item in select jsonb_array_elements(snapshots) loop
     if not exists(select 1 from public.case_sections s join public.case_revisions rev on rev.id=s.revision_id where s.id=(item->>'sectionId')::uuid and s.revision_id=(item->>'revisionId')::uuid and rev.case_id=(item->>'caseId')::uuid and s.section_key=item->>'sectionKey' and s.content=item->>'excerpt' and s.workspace_id=r.workspace_id and rev.index_state='ready' and item->>'evidenceId'=s.id::text and item->>'caseTitle'=rev.content->>'title' and item->>'outcome'=rev.content->>'outcome' and (item->>'authorId')::uuid=rev.author_id and (item->>'recordedAt')::timestamptz=rev.created_at and item->'sources'=rev.content->'sources') then raise exception 'Invalid evidence'; end if;
   end loop;
   insert into public.briefs(workspace_id,run_id,generated,evidence,hard_constraints) values(r.workspace_id,r.id,draft,snapshots,r.request->'hardConstraints') returning id into b;
 end if;
 update public.analysis_runs set status=terminal,error_code=code,usage=finish_analysis.usage,finished_at=now(),events=events||jsonb_build_array(jsonb_build_object('stage','completion','state',case when terminal in ('complete','gap_report') then 'completed' else 'failed' end,'at',now(),'code',coalesce(code,''))) where id=run;
 return b;
end $$;
create function public.reconcile_analysis(run uuid) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 select workspace_id into w from public.analysis_runs where id=run; perform private.require_member(w);
 update public.analysis_runs set status='timed_out',error_code='TIMED_OUT',finished_at=now() where id=run and status='running' and deadline_at<=now();
end $$;
create function public.edit_brief(brief uuid, text_value text, save_value boolean) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
 select workspace_id into w from public.briefs where id=brief; perform private.require_member(w);
 update public.briefs set edited_text=text_value,edited_at=now(),saved=save_value where id=brief;
end $$;
do $$ declare t text; begin
 foreach t in array array['analysis_runs','briefs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy member_read on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke all on function public.admit_analysis(uuid,jsonb,uuid,integer,integer),public.append_analysis_event(uuid,jsonb),public.finish_analysis(uuid,text,jsonb,jsonb,text,jsonb),public.reconcile_analysis(uuid),public.edit_brief(uuid,text,boolean) from public,anon;
grant execute on function public.admit_analysis(uuid,jsonb,uuid,integer,integer),public.append_analysis_event(uuid,jsonb),public.finish_analysis(uuid,text,jsonb,jsonb,text,jsonb),public.reconcile_analysis(uuid),public.edit_brief(uuid,text,boolean) to authenticated;
