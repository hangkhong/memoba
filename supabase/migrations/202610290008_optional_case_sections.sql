alter table public.case_revisions add constraint case_revisions_known_outcome_details check (content->>'outcome'='unknown' or length(trim(coalesce(content->>'observedOutcome','')))>0);

create or replace function public.publish_case_revision(r uuid, sections jsonb, model text, dimensions integer) returns jsonb language plpgsql security definer set search_path='' as $$
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
 select coalesce(array_agg(k),array[]::text[]) into expected from unnest(expected) k where length(trim(coalesce(rev.content->>k,'')))>0;
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
