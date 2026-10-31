-- An author can delete their own conversation with its turns, runs and briefs. Nothing else references these tables.
-- Turns stay immutable: the trigger lets a delete through only while delete_conversation has named that conversation in a
-- transaction-local setting. No role has a delete grant on the table, so the setting alone opens nothing.
create or replace function private.immutable_conversation_turn() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' and old.conversation_id::text=coalesce(current_setting('memoba.deleting_conversation',true),'') then return old; end if;
 raise exception 'Conversation turns are immutable' using errcode='23514';
end $$;

create function public.delete_conversation(conversation uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.conversations;
begin
 select * into c from public.conversations where id=conversation for update;
 if not found then raise exception 'Resource unavailable' using errcode='42501'; end if;
 perform private.require_member(c.workspace_id);
 if c.author_id<>auth.uid() then raise exception 'Resource unavailable' using errcode='42501'; end if;
 update public.analysis_runs set status='timed_out',error_code='TIMED_OUT',finished_at=now() where conversation_turn_id in (select id from public.conversation_turns where conversation_id=conversation) and status='running' and deadline_at<=now();
 if exists(select 1 from public.analysis_runs r join public.conversation_turns t on t.id=r.conversation_turn_id where t.conversation_id=conversation and r.status='running') then raise exception 'Conversation is running' using errcode='23505'; end if;
 delete from public.briefs where run_id in (select r.id from public.analysis_runs r join public.conversation_turns t on t.id=r.conversation_turn_id where t.conversation_id=conversation);
 delete from public.analysis_runs where conversation_turn_id in (select id from public.conversation_turns where conversation_id=conversation);
 perform set_config('memoba.deleting_conversation',conversation::text,true);
 delete from public.conversation_turns where conversation_id=conversation;
 perform set_config('memoba.deleting_conversation','',true);
 delete from public.conversations where id=conversation;
end $$;
revoke all on function public.delete_conversation(uuid) from public,anon;
grant execute on function public.delete_conversation(uuid) to authenticated;
