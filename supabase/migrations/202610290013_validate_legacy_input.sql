create or replace function private.text_run_input(input jsonb, original_message text) returns jsonb language plpgsql immutable set search_path='' as $$
declare snapshot text; remaining text; chunk text; history jsonb := '[]'::jsonb; result jsonb; fields jsonb; notes text := ''; suffix text; original_context text;
begin
 if private.valid_stored_run_input(input) is not true then raise exception 'Invalid analysis input' using errcode='23514'; end if;
 if input->>'version' is distinct from '1' then return input; end if;
 if original_message is null or length(trim(original_message))=0 then raise exception 'Invalid legacy message' using errcode='22023'; end if;
 fields:=input;
 if input->>'objective'=original_message then
   fields:=fields-'objective'; notes:='The user message is the legacy objective. ';
 end if;
 original_context:=input->>'context';
 suffix:=E'\n\nFollow-up from user: '||original_message;
 if right(original_context,length(suffix))=suffix then
   fields:=jsonb_set(fields,'{context}',to_jsonb(left(original_context,length(original_context)-length(suffix))));
   notes:=notes||'The user message was appended as the final follow-up in legacy context. ';
 end if;
 if notes='' then
   snapshot:='Legacy user-confirmed request snapshot. Concatenate these history messages to read the complete JSON: '||fields::text;
 else
   snapshot:=notes||'Concatenate these history messages to read the remaining user-confirmed request JSON: '||fields::text;
 end if;
 remaining:=snapshot;
 while length(remaining)>0 loop
   chunk:=substring(remaining from 1 for 2000);
   history:=history||jsonb_build_array(jsonb_build_object('role','user','text',chunk));
   remaining:=substring(remaining from 2001);
 end loop;
 result:=jsonb_build_object('version',2,'message',original_message,'history',history);
 if private.valid_text_run_input(result) is not true then raise exception 'Conversation context exceeds the limit' using errcode='22023'; end if;
 return result;
end $$;
