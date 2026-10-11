-- Assigned field routes.
-- Run this whole file in the Supabase SQL Editor before merging.
-- It is safe to run more than once.
-- A rep can read routes assigned to them or created by them.
-- Admins and managers can read, create, edit, and delete every route.
begin;

create or replace function public.is_admin_or_manager() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.reps
    where user_id = auth.uid() and active = true and role in ('admin', 'manager')
  );
$$;

create or replace function public.current_rep_id() returns uuid
language sql stable security definer set search_path=public as $$
  select id from public.reps
  where user_id = auth.uid() and active = true
  limit 1;
$$;

create or replace function public.can_assign_routes() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.reps
    where user_id = auth.uid() and active = true and role in ('admin', 'manager', 'owner')
  );
$$;

create table if not exists public.assigned_routes (
  id uuid primary key default gen_random_uuid(),
  assignee_id uuid not null unique references public.reps(id) on delete cascade,
  created_by uuid references public.reps(id) on delete set null,
  lead_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists assigned_routes_created_by_idx on public.assigned_routes(created_by);

alter table public.assigned_routes enable row level security;
revoke all on table public.assigned_routes from anon;
grant select, insert, update, delete on public.assigned_routes to authenticated;
grant execute on function public.is_admin_or_manager() to authenticated;
grant execute on function public.current_rep_id() to authenticated;
grant execute on function public.can_assign_routes() to authenticated;

drop policy if exists assigned_routes_select on public.assigned_routes;
create policy assigned_routes_select on public.assigned_routes
  for select to authenticated
  using (
    public.can_assign_routes()
    or assignee_id = public.current_rep_id()
    or created_by = public.current_rep_id()
  );

drop policy if exists assigned_routes_insert on public.assigned_routes;
create policy assigned_routes_insert on public.assigned_routes
  for insert to authenticated
  with check (
    public.can_assign_routes()
    or (assignee_id = public.current_rep_id() and created_by = public.current_rep_id())
  );

drop policy if exists assigned_routes_update on public.assigned_routes;
create policy assigned_routes_update on public.assigned_routes
  for update to authenticated
  using (public.can_assign_routes() or assignee_id = public.current_rep_id())
  with check (public.can_assign_routes() or assignee_id = public.current_rep_id());

drop policy if exists assigned_routes_delete on public.assigned_routes;
create policy assigned_routes_delete on public.assigned_routes
  for delete to authenticated
  using (public.can_assign_routes() or assignee_id = public.current_rep_id());

-- Hide the table from roles whose Routes feature is turned off. Admins stay allowed.
do $$ begin
  if to_regprocedure('public.feature_enabled(text)') is not null then
    execute 'drop policy if exists feature_gate on public.assigned_routes';
    execute 'create policy feature_gate on public.assigned_routes as restrictive for all to authenticated using (public.feature_enabled(''routes'')) with check (public.feature_enabled(''routes''))';
  end if;
end $$;

do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'assigned_routes') then
    alter publication supabase_realtime add table public.assigned_routes;
  end if;
end $$;

commit;
