create or replace function public.admit_analysis(w uuid, input jsonb, request_key uuid, max_concurrent integer, deadline_ms integer, cutoff_at timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.analysis_runs; version bigint;
begin
 perform private.require_member(w);
 select knowledge_version into version from public.workspaces where id=w for update;
 update public.analysis_runs set status='timed_out',error_code='TIMED_OUT',finished_at=now() where workspace_id=w and status='running' and deadline_at<=now();
 select * into r from public.analysis_runs where workspace_id=w and author_id=auth.uid() and analysis_runs.request_key=admit_analysis.request_key;
 if found then return jsonb_build_object('kind','duplicate','runId',r.id); end if;
 if (select count(*) from public.analysis_runs where workspace_id=w and status='running')>=greatest(1,least(max_concurrent,2)) then return jsonb_build_object('kind','quota'); end if;
 if cutoff_at is not null and cutoff_at<=clock_timestamp() then raise exception 'Admission deadline elapsed' using errcode='22023'; end if;
 insert into public.analysis_runs(workspace_id,author_id,request_key,request,knowledge_version,deadline_at) values(w,auth.uid(),request_key,input,version,least(now()+make_interval(secs=>greatest(1,least(deadline_ms,300000))/1000.0),coalesce(cutoff_at,'infinity'::timestamptz))) returning * into r;
 return jsonb_build_object('kind','admitted','runId',r.id,'deadlineAt',r.deadline_at);
end $$;
