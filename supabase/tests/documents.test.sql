begin;
create extension if not exists pgtap with schema extensions;
select plan(42);
insert into auth.users(id,email) values ('10000000-0000-4000-8000-000000000101','docs-member@test.invalid'),('10000000-0000-4000-8000-000000000102','docs-outsider@test.invalid');
insert into public.workspaces(id,name) values ('20000000-0000-4000-8000-000000000101','Documents'),('20000000-0000-4000-8000-000000000102','Documents other');
insert into public.workspace_members(workspace_id,user_id,role) values ('20000000-0000-4000-8000-000000000101','10000000-0000-4000-8000-000000000101','owner'),('20000000-0000-4000-8000-000000000102','10000000-0000-4000-8000-000000000102','owner');
create function pg_temp.vec() returns jsonb language sql as $$ select to_jsonb(array_prepend(1::float8,array_fill(0::float8,array[1535]))) $$;
create function pg_temp.content(notice text default 'Give 90 days.') returns jsonb language sql as $$ select jsonb_build_object('title','Price policy','description','Notice rules for price changes.','body','## Notice'||chr(10)||chr(10)||notice||chr(10)||chr(10)||'## Approval'||chr(10)||chr(10)||'CFO signs.','type','policy','area','Finance','owner','Finance','effectiveFrom','2026-01-01','sources','[]'::jsonb) $$;
create function pg_temp.sections(notice text default 'Give 90 days.') returns jsonb language sql as $$ select jsonb_build_array(
  jsonb_build_object('ordinal',0,'kind','summary','block',null,'heading','','headingPath','','text','Price policy'||chr(10)||'Notice rules for price changes.','embedding',pg_temp.vec()),
  jsonb_build_object('ordinal',1,'kind','body','block',1,'heading','Notice','headingPath','Notice','text','## Notice'||chr(10)||chr(10)||notice,'embedding',pg_temp.vec()),
  jsonb_build_object('ordinal',2,'kind','body','block',2,'heading','Approval','headingPath','Approval','text','## Approval'||chr(10)||chr(10)||'CFO signs.','embedding',pg_temp.vec())) $$;
grant execute on function pg_temp.vec(), pg_temp.content(text), pg_temp.sections(text) to authenticated;
create temporary table ids(label text primary key, id uuid);
grant all on ids to authenticated, service_role;
create temporary table results(label text primary key, result jsonb);
grant all on results to authenticated, service_role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000101","role":"authenticated","email":"docs-member@test.invalid"}',true);
insert into results select 'first',public.publish_document('20000000-0000-4000-8000-000000000101',pg_temp.content(),pg_temp.sections(),'text-embedding-3-small',1536);
insert into ids select 'doc',(select (result->>'documentId')::uuid from results where label='first');
insert into ids select 'rev1',(select (result->>'revisionId')::uuid from results where label='first');
select is((select result->>'status' from results where label='first'),'published','a member publishes a document in one call');
select is((select version from public.document_revisions where id=(select id from ids where label='rev1')),1,'the first revision is version 1');
select is((select change_note from public.document_revisions where id=(select id from ids where label='rev1')),'First published','the first version defaults its change note');
select is((select author_email from public.document_revisions where id=(select id from ids where label='rev1')),'docs-member@test.invalid','the author is recorded with the version');
select throws_ok($$select public.publish_document('20000000-0000-4000-8000-000000000101',pg_temp.content('Give 100 days.'),pg_temp.sections('Give 100 days.'),'text-embedding-3-small',1536,(select id from ids where label='doc'))$$,'22023','Change note required','a new version needs a change note');
select throws_ok($$select public.publish_document('20000000-0000-4000-8000-000000000101',pg_temp.content()||jsonb_build_object('effectiveFrom',(current_date+10)::text),pg_temp.sections(),'text-embedding-3-small',1536)$$,'22023','Effective date in the future','a future effective date is rejected');
select is((select count(*) from public.document_sections where revision_id=(select id from ids where label='rev1')),3::bigint,'the revision stores a summary and two body sections');
select is((select published_revision_id from public.documents where id=(select id from ids where label='doc')),(select id from ids where label='rev1'),'the revision is the published one');

insert into results select 'same',public.publish_document('20000000-0000-4000-8000-000000000101',pg_temp.content(),pg_temp.sections(),'text-embedding-3-small',1536,(select id from ids where label='doc'));
select is((select result->>'status' from results where label='same'),'unchanged','identical content and model return unchanged');
select is((select count(*) from public.document_revisions where document_id=(select id from ids where label='doc')),1::bigint,'unchanged adds no revision');

insert into results select 'edit',public.publish_document('20000000-0000-4000-8000-000000000101',pg_temp.content('Give 120 days.'),pg_temp.sections('Give 120 days.'),'text-embedding-3-small',1536,(select id from ids where label='doc'),'Notice raised to 120 days after the Pro increase');
insert into ids select 'rev2',(select (result->>'revisionId')::uuid from results where label='edit');
select is((select published_revision_id from public.documents where id=(select id from ids where label='doc')),(select id from ids where label='rev2'),'an edit publishes a new revision');
select is((select count(*) from public.document_revisions where document_id=(select id from ids where label='doc')),2::bigint,'earlier revisions are kept');
select is((select result->>'version' from results where label='edit'),'2','the edit is version 2');
select is((select change_note from public.document_revisions where id=(select id from ids where label='rev2')),'Notice raised to 120 days after the Pro increase','the change note is stored with the version');
select is((select result->>'version' from results where label='same'),'1','unchanged reports the current version');

reset role;
select throws_ok($$update public.document_revisions set version=9 where id=(select id from ids where label='rev1')$$,'P0001','Immutable revision','the version is immutable');
select throws_ok($$update public.document_sections set content='changed' where revision_id=(select id from ids where label='rev1')$$,'P0001','Immutable section','sections are immutable');
select throws_ok($$update public.document_revisions set content='{}' where id=(select id from ids where label='rev1')$$,'P0001','Immutable revision','revision content is immutable');
set local role authenticated;
select throws_ok($$select public.publish_document('20000000-0000-4000-8000-000000000101',pg_temp.content(),jsonb_set(pg_temp.sections(),'{1,text}','"## Notice\n\nNot in the body."'),'text-embedding-3-small',1536)$$,'P0001','Section mismatch','body sections must come from the body');
select throws_ok($$select public.publish_document('20000000-0000-4000-8000-000000000101',pg_temp.content()||'{"type":"memo"}',pg_temp.sections(),'text-embedding-3-small',1536)$$,'P0001','Invalid document','unknown types are rejected');
select throws_ok($$select public.publish_document('20000000-0000-4000-8000-000000000101',pg_temp.content(),pg_temp.sections(),'other-model',1536)$$,'22023',null,'an unsupported embedding profile is rejected');
select is((select count(*) from public.documents where workspace_id='20000000-0000-4000-8000-000000000101'),1::bigint,'failed publishes leave nothing behind');

select is((select count(*) from public.read_knowledge_document('20000000-0000-4000-8000-000000000101',(select id from ids where label='doc'),array[]::integer[],50)),2::bigint,'a read returns body sections only');
select is((select count(*) from public.read_knowledge_document('20000000-0000-4000-8000-000000000101',(select id from ids where label='doc'),array[2],50)),1::bigint,'a read can name blocks');
select is((select value->>'excerpt' from public.read_knowledge_document('20000000-0000-4000-8000-000000000101',(select id from ids where label='doc'),array[1],50,(select id from ids where label='rev1')) value),'## Notice'||chr(10)||chr(10)||'Give 90 days.','a pinned read returns the older revision');
select is((select (value->>'version')::integer from public.read_knowledge_document('20000000-0000-4000-8000-000000000101',(select id from ids where label='doc'),array[1],50,(select id from ids where label='rev1')) value),1,'evidence carries the version it came from');
select is((select value->>'source' from public.read_knowledge_document('20000000-0000-4000-8000-000000000101',(select id from ids where label='doc'),array[1],50) value),'document','document evidence carries its source');

select is((select count(*) from public.search_knowledge_documents('20000000-0000-4000-8000-000000000101','notice',(select (pg_temp.vec())::text::extensions.vector),'text-embedding-3-small',5)),1::bigint,'search returns one card per document');
select is((select (value->>'version')::integer from public.search_knowledge_documents('20000000-0000-4000-8000-000000000101','notice',(select (pg_temp.vec())::text::extensions.vector),'text-embedding-3-small',5) value),2,'the search card names the current version');
select is((select value->'outline'->0->>'heading' from public.search_knowledge_documents('20000000-0000-4000-8000-000000000101','notice',(select (pg_temp.vec())::text::extensions.vector),'text-embedding-3-small',5) value),'Notice','the card lists the outline');
select is((select jsonb_array_length(value->'matchedHeadings') from public.search_knowledge_documents('20000000-0000-4000-8000-000000000101','notice',(select (pg_temp.vec())::text::extensions.vector),'text-embedding-3-small',5) value) <= 3,true,'matched headings are capped and come from body sections');

create temporary table old_snapshots as select value as item from public.read_knowledge_document('20000000-0000-4000-8000-000000000101',(select id from ids where label='doc'),array[1],50,(select id from ids where label='rev1')) value;
create temporary table snapshots as select value as item from public.read_knowledge_document('20000000-0000-4000-8000-000000000101',(select id from ids where label='doc'),array[1],50) value;
reset role;
with saved as (insert into public.analysis_runs(workspace_id,author_id,request_key,request,knowledge_version,deadline_at) values('20000000-0000-4000-8000-000000000101','10000000-0000-4000-8000-000000000101',gen_random_uuid(),'{"version":2,"message":"Price?","history":[]}',1,now()+interval '1 hour') returning id) insert into results select 'run',jsonb_build_object('id',id) from saved;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
select throws_ok($$select public.finish_analysis((select (result->>'id')::uuid from results where label='run'),'complete',jsonb_build_object('version',2,'text','The notice is 120 days. [S:'||(select result->>'id' from results where label='run')||':1]','citations',jsonb_build_array(jsonb_build_object('marker','[S:'||(select result->>'id' from results where label='run')||':1]','evidenceId',(select item->>'evidenceId' from snapshots)))),jsonb_build_array(jsonb_set((select item from snapshots),'{excerpt}','"Made up."')),null,null)$$,'P0001','Invalid evidence','a document snapshot must match the stored section');
select throws_ok($$select public.finish_analysis((select (result->>'id')::uuid from results where label='run'),'complete',jsonb_build_object('version',2,'text','Notice. [S:'||(select result->>'id' from results where label='run')||':1]','citations',jsonb_build_array(jsonb_build_object('marker','[S:'||(select result->>'id' from results where label='run')||':1]','evidenceId',(select (id)::text from public.document_sections where kind='summary' limit 1)))),jsonb_build_array(jsonb_set((select item from snapshots),'{evidenceId}',to_jsonb((select (id)::text from public.document_sections where kind='summary' limit 1)))),null,null)$$,'P0001','Invalid evidence','the summary section is never citeable');
select public.archive_document((select id from ids where label='doc'));
select is((select count(*) from public.search_knowledge_documents('20000000-0000-4000-8000-000000000101','notice',(select (pg_temp.vec())::text::extensions.vector),'text-embedding-3-small',5)),0::bigint,'an archived document leaves new retrieval');
select is((select count(*) from public.read_knowledge_document('20000000-0000-4000-8000-000000000101',(select id from ids where label='doc'),array[]::integer[],50)),0::bigint,'an archived document cannot be read for new runs');
select public.finish_analysis((select (result->>'id')::uuid from results where label='run'),'complete',jsonb_build_object('version',2,'text','The notice is 120 days. [S:'||(select result->>'id' from results where label='run')||':1]','citations',jsonb_build_array(jsonb_build_object('marker','[S:'||(select result->>'id' from results where label='run')||':1]','evidenceId',(select item->>'evidenceId' from snapshots)))),(select jsonb_agg(item) from snapshots),null,null);
select is((select count(*) from public.briefs where workspace_id='20000000-0000-4000-8000-000000000101'),1::bigint,'an authorized historical document citation can be saved after archive');

reset role;
with saved as (insert into public.analysis_runs(workspace_id,author_id,request_key,request,knowledge_version,deadline_at) values('20000000-0000-4000-8000-000000000101','10000000-0000-4000-8000-000000000101',gen_random_uuid(),'{"version":2,"message":"Old?","history":[]}',1,now()+interval '1 hour') returning id) insert into results select 'run2',jsonb_build_object('id',id) from saved;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
select throws_ok($$select public.finish_analysis((select (result->>'id')::uuid from results where label='run2'),'complete',jsonb_build_object('version',2,'text','Old. [S:'||(select result->>'id' from results where label='run2')||':1]','citations',jsonb_build_array(jsonb_build_object('marker','[S:'||(select result->>'id' from results where label='run2')||':1]','evidenceId',(select item->>'evidenceId' from old_snapshots)))),jsonb_build_array(jsonb_set((select item from old_snapshots),'{version}','2')),null,null)$$,'P0001','Invalid evidence','a snapshot must name the version its section belongs to');
select public.finish_analysis((select (result->>'id')::uuid from results where label='run2'),'complete',jsonb_build_object('version',2,'text','Old. [S:'||(select result->>'id' from results where label='run2')||':1]','citations',jsonb_build_array(jsonb_build_object('marker','[S:'||(select result->>'id' from results where label='run2')||':1]','evidenceId',(select item->>'evidenceId' from old_snapshots)))),(select jsonb_agg(item) from old_snapshots),null,null);
select is((select count(*) from public.briefs where workspace_id='20000000-0000-4000-8000-000000000101'),2::bigint,'a citation of an older version is saved after a newer version and an archive');
select is((select evidence->0->>'version' from public.briefs where run_id=(select (result->>'id')::uuid from results where label='run2')),'1','the saved citation keeps the version it cited');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000102","role":"authenticated"}',true);
select is((select count(*) from public.documents)+(select count(*) from public.document_revisions)+(select count(*) from public.document_sections),0::bigint,'another workspace sees no documents');
select throws_ok($$select public.read_knowledge_document('20000000-0000-4000-8000-000000000101',(select id from ids where label='doc'),array[]::integer[],50)$$,'42501',null,'a non-member cannot read a document');
reset role;
set local role service_role;
select is((public.reset_demo_workspace('20000000-0000-4000-8000-000000000101',array[]::uuid[])->>'documents')::integer,1,'the demo reset removes the workspace documents');
select * from finish();rollback;
