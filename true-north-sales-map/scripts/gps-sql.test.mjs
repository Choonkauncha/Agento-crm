import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const migration = readFileSync(new URL('../supabase/migrations/20261023222511_users_gps_shift_capture.sql', import.meta.url), 'utf8');
try {
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls; create role supabase_auth_admin;
    create schema auth; create schema storage; create publication supabase_realtime;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',encrypted_password text);
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
    alter table storage.objects enable row level security;
    grant usage on schema public,auth,storage to authenticated,service_role;
    grant all on storage.objects to authenticated;`);
  await db.exec(readFileSync(new URL('../supabase/setup_all.sql', import.meta.url), 'utf8').replaceAll('create extension if not exists pgcrypto;', ''));
  await db.exec(readFileSync(new URL('../supabase/migrations/20261010_integrity_access.sql', import.meta.url), 'utf8'));
  await db.exec(migration); // Reapplying is safe and preserves restrictive gates.

  const admin = '11111111-1111-4111-8111-111111111111';
  const adminUser = '22222222-2222-4222-8222-222222222222';
  const setter = '33333333-3333-4333-8333-333333333333';
  const setterUser = '44444444-4444-4444-8444-444444444444';
  const manager = '55555555-5555-4555-8555-555555555555';
  const managerUser = '66666666-6666-4666-8666-666666666666';
  const inactive = '77777777-7777-4777-8777-777777777777';
  const inactiveUser = '88888888-8888-4888-8888-888888888888';
  await db.exec(`insert into auth.users(id,email,encrypted_password) values
    ('${adminUser}','admin@example.test','old'),('${setterUser}','setter@example.test','old'),
    ('${managerUser}','manager@example.test','old'),('${inactiveUser}','inactive@example.test','old');
    insert into reps(id,user_id,name,role,active) values
    ('${admin}','${adminUser}','GPS Admin','admin',true),('${setter}','${setterUser}','GPS Setter','appointment_setter',true),
    ('${manager}','${managerUser}','GPS Manager','manager',true),('${inactive}','${inactiveUser}','Inactive','salesperson',false);`);

  async function as(user) {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role','authenticated',false)", [user]);
    await db.exec('set role authenticated');
  }
  async function consent() {
    await db.query("insert into location_consents(notice_version,notice_text) values ('ignored','ignored')");
  }
  async function clockIn() {
    return (await db.query('insert into shifts(clock_in_lat,clock_in_lng) values (40.7,-82.5) returning id,clock_in_at,rep_id')).rows[0];
  }
  async function point(shift, capturedAt, rep = null) {
    // return=minimal is essential: field users cannot SELECT precise history.
    await db.query('insert into location_points(shift_id,lat,lng,accuracy_m,kind,captured_at,rep_id) values ($1,40.7,-82.5,8,\'live\',$2,$3)', [shift, capturedAt, rep]);
  }

  await as(adminUser);
  await assert.rejects(clockIn(), /location notice/);
  await consent();
  const adminShift = await clockIn();
  assert.equal(adminShift.rep_id, admin);
  const fix = adminShift.clock_in_at;
  await point(adminShift.id, fix, setter); // Ownership supplied by a client is overwritten.
  let saved = (await db.query('select rep_id,captured_at from location_points where shift_id=$1', [adminShift.id])).rows[0];
  assert.equal(saved.rep_id, admin);
  assert.equal(new Date(saved.captured_at).getTime(), new Date(fix).getTime(), 'Acquisition time survives storage');
  await assert.rejects(point(adminShift.id, new Date(Date.now() - 25000).toISOString()), /recent fix/);
  await assert.rejects(point(adminShift.id, new Date(Date.now() + 10000).toISOString()), /recent fix/);
  await assert.rejects(point(adminShift.id, new Date(new Date(adminShift.clock_in_at).getTime() - 1).toISOString()), /recent fix/);
  await assert.rejects(db.query('update location_points set lat=0'), /permission denied/);
  await assert.rejects(db.query('delete from location_points'), /permission denied/);

  await as(setterUser);
  await consent();
  const setterShift = await clockIn();
  await assert.rejects(point(adminShift.id, setterShift.clock_in_at), /your own open shift/);
  await point(setterShift.id, setterShift.clock_in_at);
  assert.equal((await db.query('select count(*)::int n from location_points')).rows[0].n, 0, 'Field users cannot read even their own precise history');
  await db.query('update shifts set clock_out_at=now() where id=$1', [setterShift.id]);
  await assert.rejects(point(setterShift.id, new Date().toISOString()), /your own open shift/);

  await db.exec('reset role');
  await db.query("update feature_permissions set enabled=false where role='appointment_setter' and feature='shifts'");
  await db.exec('set role authenticated');
  await assert.rejects(clockIn(), /row-level security|location notice/);
  assert.equal((await db.query('select count(*)::int n from shifts')).rows[0].n, 0, 'Feature-disabled users cannot read shift records');
  await db.exec('reset role');
  await db.query("update feature_permissions set enabled=true where role='appointment_setter' and feature='shifts'");

  await as(managerUser);
  await consent();
  const managerShift = await clockIn();
  await point(managerShift.id, managerShift.clock_in_at);
  assert.equal((await db.query('select count(*)::int n from location_points')).rows[0].n, 3, 'Management sees recorded history');
  await assert.rejects(point(adminShift.id, managerShift.clock_in_at), /your own open shift/);

  await as(inactiveUser);
  await assert.rejects(consent(), /No active team profile/);
  assert.equal((await db.query('select count(*)::int n from location_points')).rows[0].n, 0);

  await as(adminUser);
  await db.exec('reset role');
  await db.query('update reps set must_change_password=true where id=$1', [admin]);
  await db.exec('set role authenticated');
  assert.equal((await db.query('select count(*)::int n from location_points')).rows[0].n, 0, 'Password gate remains enforced');
  await assert.rejects(point(adminShift.id, new Date().toISOString()), /No active team profile/);
  await db.exec('reset role');
  const gates = (await db.query("select policyname,permissive from pg_policies where tablename='location_points' and policyname in ('feature_gate','session_ready_gate','location_points_management_read') order by policyname")).rows;
  assert.equal(gates.length, 3);
  assert.ok(gates.every(policy => policy.permissive === 'RESTRICTIVE'));
  console.log('Users GPS SQL: admin/manager own shifts, consent, acquisition time, stale/future/off-shift rejection, ownership isolation, management-only history and preserved feature/password gates passed');
} finally {
  await db.close();
}
