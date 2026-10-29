create function private.text_run_input(input jsonb, original_message text) returns jsonb language plpgsql immutable set search_path='' as $$
declare snapshot text; remaining text; chunk text; history jsonb := '[]'::jsonb;
begin
 if input->>'version' is distinct from '1' then return input; end if;
 if original_message is null or length(trim(original_message))=0 then raise exception 'Invalid legacy message' using errcode='22023'; end if;
 snapshot:='Legacy user-confirmed request snapshot. Concatenate these history messages to read the complete JSON: ' || input::text;
 remaining:=snapshot;
 while length(remaining)>0 loop
   if jsonb_array_length(history)>=12 then raise exception 'Conversation context exceeds the limit' using errcode='22023'; end if;
   chunk:=substring(remaining from 1 for 2000);
   history:=history||jsonb_build_array(jsonb_build_object('role','user','text',chunk));
   remaining:=substring(remaining from 2001);
 end loop;
 return jsonb_build_object('version',2,'message',original_message,'history',history);
end $$;
revoke all on function private.text_run_input(jsonb,text) from public,anon,authenticated;

create or replace function public.admit_analysis(w uuid, input jsonb, request_key uuid, max_concurrent integer, deadline_ms integer, cutoff_at timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.analysis_runs; version bigint; run_input jsonb;
begin
 perform private.require_member(w);
 select knowledge_version into version from public.workspaces where id=w for update;
 update public.analysis_runs set status='timed_out',error_code='TIMED_OUT',finished_at=now() where workspace_id=w and status='running' and deadline_at<=now();
 select * into r from public.analysis_runs where workspace_id=w and author_id=auth.uid() and analysis_runs.request_key=admit_analysis.request_key;
 if found then return jsonb_build_object('kind','duplicate','runId',r.id); end if;
 if (select count(*) from public.analysis_runs where workspace_id=w and status='running')>=greatest(1,least(max_concurrent,2)) then return jsonb_build_object('kind','quota'); end if;
 if cutoff_at is not null and cutoff_at<=clock_timestamp() then raise exception 'Admission deadline elapsed' using errcode='22023'; end if;
 run_input:=private.text_run_input(input,coalesce(input->>'message',input->>'objective'));
 insert into public.analysis_runs(workspace_id,author_id,request_key,request,knowledge_version,deadline_at) values(w,auth.uid(),request_key,run_input,version,least(now()+make_interval(secs=>greatest(1,least(deadline_ms,300000))/1000.0),coalesce(cutoff_at,'infinity'::timestamptz))) returning * into r;
 return jsonb_build_object('kind','admitted','runId',r.id,'deadlineAt',r.deadline_at,'input',r.request);
end $$;

create or replace function public.admit_conversation_analysis(turn uuid, request_key uuid, max_concurrent integer, deadline_ms integer, cutoff_at timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.conversation_turns; c public.conversations; result jsonb; existing public.analysis_runs;
begin
 select * into t from public.conversation_turns where id=turn;
 if not found then raise exception 'Resource unavailable' using errcode='42501'; end if;
 perform private.require_member(t.workspace_id);
 -- Match the existing admission lock order before serializing this conversation.
 perform 1 from public.workspaces where id=t.workspace_id for update;
 select * into c from public.conversations where id=t.conversation_id for update;
 if c.author_id<>auth.uid() then raise exception 'Resource unavailable' using errcode='42501'; end if;
 select * into existing from public.analysis_runs where workspace_id=t.workspace_id and author_id=auth.uid() and analysis_runs.request_key=admit_conversation_analysis.request_key;
 if found then
   if existing.conversation_turn_id is distinct from turn then raise exception 'Request key reused' using errcode='23505'; end if;
   return jsonb_build_object('kind','duplicate','runId',existing.id);
 end if;
 if t.id<>(select id from public.conversation_turns where conversation_id=t.conversation_id order by position desc limit 1) then raise exception 'Conversation changed' using errcode='23505'; end if;
 if exists(select 1 from public.analysis_runs where conversation_turn_id=turn and status in ('complete','gap_report')) then raise exception 'Turn already answered' using errcode='23505'; end if;
 update public.analysis_runs set status='timed_out',error_code='TIMED_OUT',finished_at=now() where workspace_id=t.workspace_id and status='running' and deadline_at<=now();
 if exists(select 1 from public.analysis_runs r join public.conversation_turns sibling on sibling.id=r.conversation_turn_id where sibling.conversation_id=t.conversation_id and r.status='running') then return jsonb_build_object('kind','quota'); end if;
 result:=public.admit_analysis(t.workspace_id,private.text_run_input(t.request,t.message),request_key,max_concurrent,deadline_ms,cutoff_at);
 if result->>'kind'='admitted' then update public.analysis_runs set conversation_turn_id=turn where id=(result->>'runId')::uuid; end if;
 return result;
end $$;
