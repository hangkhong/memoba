create or replace function public.admit_analysis(w uuid, input jsonb, request_key uuid, max_concurrent integer, deadline_ms integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.analysis_runs; version bigint;
begin
 perform private.require_member(w);
 select knowledge_version into version from public.workspaces where id=w for update;
 update public.analysis_runs set status='timed_out',error_code='TIMED_OUT',finished_at=now() where workspace_id=w and status='running' and deadline_at<=now();
 select * into r from public.analysis_runs where workspace_id=w and author_id=auth.uid() and analysis_runs.request_key=admit_analysis.request_key;
 if found then return jsonb_build_object('kind','duplicate','runId',r.id); end if;
 if (select count(*) from public.analysis_runs where workspace_id=w and status='running')>=greatest(1,least(max_concurrent,2)) then return jsonb_build_object('kind','quota'); end if;
 insert into public.analysis_runs(workspace_id,author_id,request_key,request,knowledge_version,deadline_at) values(w,auth.uid(),request_key,input,version,now()+make_interval(secs=>greatest(1,least(deadline_ms,300000))/1000.0)) returning * into r;
 return jsonb_build_object('kind','admitted','runId',r.id,'deadlineAt',r.deadline_at);
end $$;

create or replace function public.finish_analysis(run uuid, terminal text, draft jsonb, snapshots jsonb, code text, usage jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.analysis_runs; b uuid; item jsonb; claim jsonb; ref jsonb; field text; marker text;
begin
 select * into r from public.analysis_runs where id=run for update; perform private.require_member(r.workspace_id);
 if r.author_id<>auth.uid() then raise exception 'Resource unavailable' using errcode='42501'; end if;
 if r.status<>'running' then return null; end if;
 if now()>=r.deadline_at then terminal:='timed_out'; code:='TIMED_OUT'; end if;
 if terminal not in ('complete','gap_report','failed','cancelled','timed_out') then raise exception 'Invalid terminal'; end if;
 if terminal='complete' then
   if draft is null or jsonb_array_length(snapshots)>40 then raise exception 'Invalid brief'; end if;
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
     if not exists(select 1 from public.case_sections s join public.case_revisions rev on rev.id=s.revision_id where s.id=(item->>'sectionId')::uuid and s.revision_id=(item->>'revisionId')::uuid and rev.case_id=(item->>'caseId')::uuid and s.section_key=item->>'sectionKey' and s.content=item->>'excerpt' and s.workspace_id=r.workspace_id and rev.index_state='ready' and item->>'evidenceId'=s.id::text and item->>'caseTitle'=rev.content->>'title' and item->>'outcome'=rev.content->>'outcome' and (item->>'authorId')::uuid=rev.author_id and (item->>'recordedAt')::timestamptz=rev.created_at and item->'sources'=rev.content->'sources') then raise exception 'Invalid evidence'; end if;
   end loop;
   insert into public.briefs(workspace_id,run_id,generated,evidence,hard_constraints) values(r.workspace_id,r.id,draft,snapshots,case when r.request->>'version'='2' then '[]'::jsonb else r.request->'hardConstraints' end) returning id into b;
 end if;
 update public.analysis_runs set status=terminal,error_code=code,usage=finish_analysis.usage,finished_at=now(),events=events||jsonb_build_array(jsonb_build_object('stage','completion','state',case when terminal in ('complete','gap_report') then 'completed' else 'failed' end,'at',now(),'code',coalesce(code,''))) where id=run;
 return b;
end $$;

create or replace function public.save_conversation_turn(conversation uuid, key uuid, body text, input jsonb, parent uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.conversations; previous public.conversation_turns; existing public.conversation_turns; saved uuid;
begin
 select * into c from public.conversations where id=conversation for update;
 if not found then raise exception 'Resource unavailable' using errcode='42501'; end if;
 perform private.require_member(c.workspace_id);
 if c.author_id<>auth.uid() then raise exception 'Resource unavailable' using errcode='42501'; end if;
 if input->>'version'='2' and input->>'message' is distinct from body then raise exception 'Turn message does not match input' using errcode='23514'; end if;
 select * into existing from public.conversation_turns where conversation_id=conversation and request_key=key;
 if found then
   if existing.request<>input or existing.message<>body or existing.parent_turn_id is distinct from parent then raise exception 'Request key reused' using errcode='23505'; end if;
   return existing.id;
 end if;
 update public.analysis_runs set status='timed_out',error_code='TIMED_OUT',finished_at=now() where conversation_turn_id in (select id from public.conversation_turns where conversation_id=conversation) and status='running' and deadline_at<=now();
 if exists(select 1 from public.analysis_runs r join public.conversation_turns t on t.id=r.conversation_turn_id where t.conversation_id=conversation and r.status='running') then raise exception 'Conversation is running' using errcode='23505'; end if;
 select * into previous from public.conversation_turns where conversation_id=conversation order by position desc limit 1;
 if previous.id is distinct from parent then raise exception 'Conversation changed' using errcode='23505'; end if;
 insert into public.conversation_turns(workspace_id,conversation_id,position,parent_turn_id,request_key,message,request)
 values(c.workspace_id,conversation,coalesce(previous.position,0)+1,parent,key,body,input) returning id into saved;
 update public.conversations set updated_at=now(),title=case when parent is null then left(body,200) else title end where id=conversation;
 return saved;
end $$;
