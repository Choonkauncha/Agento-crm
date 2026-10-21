begin;
create table if not exists public.field_settings (
 id text primary key check (id = 'team'),
 groupme_url text not null default '' check (groupme_url = '' or (length(groupme_url) <= 1000 and groupme_url ~ '^https://(www\.|web\.)?groupme\.com/[^[:space:]]*$'))
);
alter table public.field_settings enable row level security;
revoke all on public.field_settings from anon;
grant select,insert,update on public.field_settings to authenticated;
create policy field_settings_read on public.field_settings for select to authenticated using (exists(select 1 from public.reps where user_id=(select auth.uid()) and active=true and role in ('appointment_setter','canvasser','salesperson','manager','admin')));
create policy field_settings_insert on public.field_settings for insert to authenticated with check (exists(select 1 from public.reps where user_id=(select auth.uid()) and active=true and role='admin'));
create policy field_settings_update on public.field_settings for update to authenticated using (exists(select 1 from public.reps where user_id=(select auth.uid()) and active=true and role='admin')) with check (exists(select 1 from public.reps where user_id=(select auth.uid()) and active=true and role='admin'));
insert into public.field_settings(id) values ('team') on conflict(id) do nothing;
commit;
