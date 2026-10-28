create table public.conversations (
 id uuid primary key, workspace_id uuid not null references public.workspaces,
 author_id uuid not null references auth.users, title text not null default 'New conversation',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id, workspace_id)
);
create table public.conversation_turns (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null,
 conversation_id uuid not null, position integer not null check(position>0),
 parent_turn_id uuid, request_key uuid not null, message text not null,
 request jsonb not null, created_at timestamptz not null default now(),
 unique(id, workspace_id), unique(id, conversation_id),
 unique(conversation_id, position), unique(conversation_id, request_key),
 foreign key(conversation_id, workspace_id) references public.conversations(id, workspace_id),
 foreign key(parent_turn_id, conversation_id) references public.conversation_turns(id, conversation_id)
);
alter table public.analysis_runs add column conversation_turn_id uuid;
alter table public.analysis_runs add constraint run_conversation_turn foreign key(conversation_turn_id,workspace_id) references public.conversation_turns(id,workspace_id);
create index conversation_history on public.conversations(workspace_id,updated_at desc);
create index turn_runs on public.analysis_runs(conversation_turn_id,created_at);

create function public.create_conversation(w uuid, conversation uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.conversations;
begin
 perform private.require_member(w);
 insert into public.conversations(id,workspace_id,author_id) values(conversation,w,auth.uid()) on conflict(id) do nothing;
 select * into existing from public.conversations where id=conversation;
 if existing.workspace_id<>w or existing.author_id<>auth.uid() then raise exception 'Resource unavailable' using errcode='42501'; end if;
 return existing.id;
end $$;

create function public.save_conversation_turn(conversation uuid, key uuid, body text, input jsonb, parent uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.conversations; previous public.conversation_turns; existing public.conversation_turns; saved uuid;
begin
 select * into c from public.conversations where id=conversation for update;
 if not found then raise exception 'Resource unavailable' using errcode='42501'; end if;
 perform private.require_member(c.workspace_id);
 if c.author_id<>auth.uid() then raise exception 'Resource unavailable' using errcode='42501'; end if;
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

create function public.admit_conversation_analysis(turn uuid, request_key uuid, max_concurrent integer, deadline_ms integer) returns jsonb language plpgsql security definer set search_path='' as $$
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
 result:=public.admit_analysis(t.workspace_id,t.request,request_key,max_concurrent,deadline_ms);
 if result->>'kind'='admitted' then update public.analysis_runs set conversation_turn_id=turn where id=(result->>'runId')::uuid; end if;
 return result;
end $$;

create function private.immutable_conversation_turn() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Conversation turns are immutable' using errcode='23514'; end $$;
create trigger immutable_turn before update or delete on public.conversation_turns for each row execute function private.immutable_conversation_turn();

do $$ declare t text; begin
 foreach t in array array['conversations','conversation_turns'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy member_read on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke all on function public.create_conversation(uuid,uuid),public.save_conversation_turn(uuid,uuid,text,jsonb,uuid),public.admit_conversation_analysis(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.create_conversation(uuid,uuid),public.save_conversation_turn(uuid,uuid,text,jsonb,uuid),public.admit_conversation_analysis(uuid,uuid,integer,integer) to authenticated;
