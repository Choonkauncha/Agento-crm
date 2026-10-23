-- Own-shift GPS capture for every working role; precise history is management-only.
-- Apply before deploying the Users GPS UI. No synthetic activity is inserted.
begin;

create or replace function public.location_consents_stamp()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if public.current_rep_id() is null then
    raise exception 'No active team profile';
  end if;
  if public.current_rep_role() not in ('appointment_setter','canvasser','salesperson','admin','manager') then
    raise exception 'This profile cannot share shift location';
  end if;
  new.rep_id := public.current_rep_id();
  new.consented_at := now();
  new.notice_version := '2026-10-14';
  new.notice_text := $notice$While you are clocked in, True North shares your location with management and saves updates about every 5 seconds while this app is running, as well as clock-in, clock-out, and door points. Sharing stops when you clock out or sign out. Your browser will request location permission. Keep the app open for current updates; your phone may pause updates when it is locked or the app is in the background.$notice$;
  return new;
end;
$$;

create or replace function public.shifts_stamp_owner()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if public.current_rep_id() is null then
    raise exception 'No active team profile';
  end if;
  if public.current_rep_role() not in ('appointment_setter','canvasser','salesperson','admin','manager') then
    raise exception 'This profile cannot clock in';
  end if;
  if not exists (
    select 1 from public.location_consents c
    where c.rep_id = public.current_rep_id() and c.notice_version = '2026-10-14'
  ) then
    raise exception 'Agree to the location notice before clocking in';
  end if;
  new.rep_id := public.current_rep_id();
  new.clock_in_at := now();
  new.clock_out_at := null;
  new.clock_out_lat := null;
  new.clock_out_lng := null;
  return new;
end;
$$;

create or replace function public.location_points_stamp()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
declare active_shift public.shifts%rowtype;
begin
  if public.current_rep_id() is null then
    raise exception 'No active team profile';
  end if;
  if public.current_rep_role() not in ('appointment_setter','canvasser','salesperson','admin','manager') then
    raise exception 'This profile cannot share shift location';
  end if;
  if not exists (
    select 1 from public.location_consents c
    where c.rep_id = public.current_rep_id() and c.notice_version = '2026-10-14'
  ) then
    raise exception 'Agree to the location notice before sharing location';
  end if;
  new.rep_id := public.current_rep_id();
  -- Serialize inserts against clock-out: neither a late request nor another
  -- user's shift can accept a location after the shift has closed.
  select * into active_shift from public.shifts s
    where s.id = new.shift_id and s.rep_id = new.rep_id and s.clock_out_at is null
    for update;
  if active_shift.id is null then
    raise exception 'Location can only be saved during your own open shift';
  end if;
  -- Keep acquisition time, not network-arrival time. Missing timestamps remain
  -- compatible with clock-in/out and older clients, using the column default.
  new.captured_at := coalesce(new.captured_at, now());
  if new.captured_at < now() - interval '20 seconds'
     or new.captured_at > now() + interval '5 seconds'
     or new.captured_at < active_shift.clock_in_at then
    raise exception 'Location capture time must be a recent fix within this shift';
  end if;
  new.created_at := now();
  return new;
end;
$$;

-- Existing session_ready_gate / feature_gate restrictive policies stay intact.
drop policy if exists shifts_insert on public.shifts;
create policy shifts_insert on public.shifts for insert to authenticated
  with check (rep_id = public.current_rep_id() and public.current_rep_role()
    in ('appointment_setter','canvasser','salesperson','admin','manager'));

drop policy if exists location_points_insert on public.location_points;
create policy location_points_insert on public.location_points for insert to authenticated
  with check (rep_id = public.current_rep_id() and public.current_rep_role()
    in ('appointment_setter','canvasser','salesperson','admin','manager')
    and exists (select 1 from public.shifts s where s.id = shift_id
      and s.rep_id = public.current_rep_id() and s.clock_out_at is null));

drop policy if exists location_points_select on public.location_points;
create policy location_points_select on public.location_points for select to authenticated
  using (public.is_admin_or_manager());
-- A restrictive policy protects against an additional permissive SELECT policy
-- accidentally widening access in a future installation.
drop policy if exists location_points_management_read on public.location_points;
create policy location_points_management_read on public.location_points
  as restrictive for select to authenticated using (public.is_admin_or_manager());

revoke update, delete on public.location_points from authenticated, anon;
revoke all on function public.location_consents_stamp() from public, anon;
revoke all on function public.shifts_stamp_owner() from public, anon;
revoke all on function public.location_points_stamp() from public, anon;
grant execute on function public.location_consents_stamp(), public.shifts_stamp_owner(), public.location_points_stamp() to authenticated;
create index if not exists location_points_rep_captured_idx
  on public.location_points (rep_id, captured_at desc);
commit;
