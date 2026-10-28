begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users(id, email) values
 ('10000000-0000-4000-8000-000000000001', 'member@test.invalid'),
 ('10000000-0000-4000-8000-000000000002', 'outsider@test.invalid');
insert into public.workspaces(id, name) values
 ('20000000-0000-4000-8000-000000000001', 'Authorized'),
 ('20000000-0000-4000-8000-000000000002', 'Other workspace');
insert into public.workspace_members(workspace_id, user_id, role) values
 ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner');

set local role anon;
select is((select count(*) from public.workspaces), 0::bigint, 'anonymous cannot read workspaces');
select is((select count(*) from public.workspace_members), 0::bigint, 'anonymous cannot read memberships');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.workspaces), 0::bigint, 'nonmember cannot read a workspace');
select is((select count(*) from public.workspace_members), 0::bigint, 'nonmember cannot read membership');
select throws_ok($$insert into public.workspace_members(workspace_id, user_id) values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002')$$, '42501', null, 'public signup cannot enroll a member');
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.workspaces), 1::bigint, 'member sees their workspace');
select is((select count(*) from public.workspaces where id = '20000000-0000-4000-8000-000000000002'), 0::bigint, 'forged workspace is not visible');
select is((select count(*) from public.workspace_members), 1::bigint, 'member sees own membership');
reset role;
delete from public.workspace_members;
set local role authenticated;
select is((select count(*) from public.workspaces), 0::bigint, 'revoked membership removes access');
select * from finish();
rollback;
