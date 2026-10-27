create extension if not exists vector with schema extensions;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  knowledge_version bigint not null default 0 check (knowledge_version >= 0),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

grant select on public.workspaces, public.workspace_members to anon, authenticated;
grant all on public.workspaces, public.workspace_members to service_role;
create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
create policy workspace_member_read on public.workspaces for select to authenticated
  using ((select public.is_workspace_member(id)));
create policy own_membership_read on public.workspace_members for select to authenticated
  using (user_id = (select auth.uid()));
