import assert from 'node:assert/strict';
import {cleanGroupMeUrl,appointmentAudience,messageAudience} from '../lib/scheduling.js';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
assert.equal(cleanGroupMeUrl('  https://groupme.com/join_group/123/abc '),'https://groupme.com/join_group/123/abc');
assert.equal(cleanGroupMeUrl(''),'');
for(const link of ['javascript:alert(1)','http://groupme.com/a','https://groupme.com.evil.test/a','https://evil.test/groupme.com','https://user:pass@groupme.com/a','https://groupme.com:444/a'])assert.throws(()=>cleanGroupMeUrl(link));
const appointment={id:'a',canvasser_id:'setter',salesperson_id:'sales'};
for(const [id,role,expected] of [['admin','admin',true],['manager','manager',true],['setter','appointment_setter',true],['other','appointment_setter',false],['sales','salesperson',true],['setter','salesperson',false],['sales','appointment_setter',false],['sales','homeowner',false]]){
 assert.equal(appointmentAudience({id,role},appointment),expected,`${role}/${id}`);
}
assert.equal(messageAudience({rep:{id:'setter',role:'appointment_setter'},threadId:'mine'},{id:'msg',thread_id:'other'}),false);
assert.equal(messageAudience({rep:{id:'setter',role:'appointment_setter'},threadId:'mine'},{id:'msg',thread_id:'mine'}),true);
assert.equal(messageAudience(null,{id:'msg'}),false);
// Execute the actual migration and exercise RLS under separate user identities.
const db=new PGlite();
await db.exec(`create role authenticated;create role anon;create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.reps(id uuid primary key,user_id uuid,role text,active boolean);
grant usage on schema auth,public to authenticated,anon;grant select on reps to authenticated;
insert into reps values ('11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','admin',true),('22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','appointment_setter',true),('33333333-3333-4333-8333-333333333333','33333333-3333-4333-8333-333333333333','manager',true),('44444444-4444-4444-8444-444444444444','44444444-4444-4444-8444-444444444444','admin',false);`);
await db.exec(readFileSync(new URL('../supabase/migrations/20261021151943_field_scheduling_settings.sql',import.meta.url),'utf8'));
await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);update field_settings set groupme_url='https://groupme.com/join_group/123/abc' where id='team';`);
assert.equal((await db.query('select groupme_url from field_settings')).rows[0].groupme_url,'https://groupme.com/join_group/123/abc');
for(const id of ['22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333']){
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
 assert.equal((await db.query('select * from field_settings')).rows.length,1);
 assert.equal((await db.query("update field_settings set groupme_url='' returning id")).rows.length,0);
 await assert.rejects(db.query("insert into field_settings values('team','') on conflict(id) do update set groupme_url=''"),/row-level security/);
}
await db.exec(`select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false)`);
assert.equal((await db.query('select * from field_settings')).rows.length,0);
await db.exec('set role anon');await assert.rejects(db.query('select * from field_settings'),/permission denied/);
await db.close();
console.log('Scheduling URL validation, role/ownership audiences, admin-only settings RLS passed');
