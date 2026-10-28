begin;
create extension if not exists pgtap with schema extensions;
select plan(2);
insert into auth.users(id,email) values ('10000000-0000-4000-8000-000000000007','retrieval@test.invalid');
insert into public.workspaces(id,name) values ('20000000-0000-4000-8000-000000000007','Retrieval');
insert into public.workspace_members values ('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000007','owner',now());
insert into public.concepts(id,workspace_id,kind,label) values('40000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000007','approach','Pilot');
create temporary table ids(result jsonb);grant all on ids to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000007","role":"authenticated"}',true);
insert into ids values(public.save_case_revision('20000000-0000-4000-8000-000000000007','{"title":"Canary","template":"product_delivery","outcome":"achieved","problem":"Canary","context":"Team","constraints":"No downtime","approach":"Canary","observedOutcome":"Released","lessons":"Monitor","deliverable":"Feature","changeScope":"Checkout","deploymentConditions":"Rollback","sources":[],"conceptIds":["40000000-0000-4000-8000-000000000007"]}'));
select public.publish_case_revision((select (result->>'revisionId')::uuid from ids),(select jsonb_agg(jsonb_build_object('key',key,'text',value,'embedding',to_jsonb(array_prepend(1::float8,array_fill(0::float8,array[1535]))))) from public.case_revisions,jsonb_each_text(content) where workspace_id='20000000-0000-4000-8000-000000000007' and key in ('problem','context','constraints','approach','observedOutcome','lessons','deliverable','changeScope','deploymentConditions')),'gemini-embedding-2',1536);

create function pg_temp.publish(rev uuid) returns jsonb language sql as $$
 select public.publish_case_revision(rev,(select jsonb_agg(jsonb_build_object('key',key,'text',value,'embedding',to_jsonb(array_prepend(1::float8,array_fill(0::float8,array[1535]))))) from public.case_revisions,jsonb_each_text(content) where id=rev and key in ('problem','context','constraints','approach','observedOutcome','lessons','deliverable','changeScope','deploymentConditions')),'gemini-embedding-2',1536);
$$;
create temporary table target(result jsonb);
insert into target values(public.save_case_revision('20000000-0000-4000-8000-000000000007',(select jsonb_set(content,'{title}','"Target"') from public.case_revisions where id=(select (result->>'revisionId')::uuid from ids))));
select pg_temp.publish((select (result->>'revisionId')::uuid from target));
select is((select count(*) from public.expand_knowledge('20000000-0000-4000-8000-000000000007',array[(select (result->>'caseId')::uuid from ids)],array['related_to'],40)),9::bigint,'published shared concept expands to target');
select public.save_case_revision('20000000-0000-4000-8000-000000000007',(select jsonb_set(content,'{conceptIds}','[]') from public.case_revisions where id=(select (result->>'revisionId')::uuid from target)),(select (result->>'caseId')::uuid from target));
select pg_temp.publish((select latest_revision_id from public.cases where id=(select (result->>'caseId')::uuid from target)));
select is((select count(*) from public.expand_knowledge('20000000-0000-4000-8000-000000000007',array[(select (result->>'caseId')::uuid from ids)],array['related_to'],40)),0::bigint,'removed concept in current publication does not expand through history');
select * from finish();rollback;
