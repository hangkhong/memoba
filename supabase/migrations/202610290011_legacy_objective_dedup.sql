create or replace function private.text_run_input(input jsonb, original_message text) returns jsonb language plpgsql immutable set search_path='' as $$
declare snapshot text; remaining text; chunk text; history jsonb := '[]'::jsonb;
begin
 if input->>'version' is distinct from '1' then return input; end if;
 if original_message is null or length(trim(original_message))=0 then raise exception 'Invalid legacy message' using errcode='22023'; end if;
 if input->>'objective'=original_message then
   snapshot:='The user message is the legacy objective. Concatenate these history messages to read the remaining user-confirmed request JSON: ' || (input-'objective')::text;
 else
   snapshot:='Legacy user-confirmed request snapshot. Concatenate these history messages to read the complete JSON: ' || input::text;
 end if;
 remaining:=snapshot;
 while length(remaining)>0 loop
   if jsonb_array_length(history)>=12 then raise exception 'Conversation context exceeds the limit' using errcode='22023'; end if;
   chunk:=substring(remaining from 1 for 2000);
   history:=history||jsonb_build_array(jsonb_build_object('role','user','text',chunk));
   remaining:=substring(remaining from 2001);
 end loop;
 return jsonb_build_object('version',2,'message',original_message,'history',history);
end $$;
