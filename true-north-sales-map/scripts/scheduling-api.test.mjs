import assert from 'node:assert/strict';
import handler from '../api/field.js';
const originalFetch=globalThis.fetch;
const oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_ANON_KEY;
process.env.SUPABASE_URL='https://example.test';process.env.SUPABASE_ANON_KEY='test';
const me='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
let role='appointment_setter',enabled=true,paths=[];
const records=[{id:'mine-setter',canvasser_id:me,salesperson_id:other},{id:'mine-sales',canvasser_id:other,salesperson_id:me},{id:'other',canvasser_id:other,salesperson_id:other}];
globalThis.fetch=async(input,options={})=>{
 const url=new URL(input);paths.push(url.pathname+url.search);let data=[];
 if(url.pathname==='/auth/v1/user')data={id:me};
 if(url.pathname==='/rest/v1/reps')data=[{id:me,role,name:'Test'}];
 if(url.pathname==='/rest/v1/rpc/password_gate_status')data={must_change:false,impersonating:false};
 if(url.pathname==='/rest/v1/rpc/feature_enabled')data=enabled;
 // Deliberately return other users' records: API must filter again.
 if(url.pathname==='/rest/v1/appointments')data=records;
 if(url.pathname==='/rest/v1/field_settings')data=[{groupme_url:'https://groupme.com/join_group/123/test'}];
 return new Response(JSON.stringify(data),{status:200});
};
const get=async(view)=>handler.fetch(new Request(`https://app.test/api/field?view=${view}`,{headers:{authorization:'Bearer test'}}));
try{
 for(const [nextRole,expected,filter] of [['appointment_setter',['mine-setter'],'canvasser_id'],['canvasser',['mine-setter'],'canvasser_id'],['salesperson',['mine-sales'],'salesperson_id'],['admin',records.map(r=>r.id),null],['manager',records.map(r=>r.id),null]]){
  role=nextRole;paths=[];const response=await get('status');assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.appointments.map(a=>a.id),expected);
  const path=paths.find(p=>p.startsWith('/rest/v1/appointments'));if(filter)assert.ok(path.includes(`${filter}=eq.${me}`));
 }
 enabled=false;paths=[];assert.deepEqual((await (await get('status')).json()).appointments,[]);assert.ok(!paths.some(p=>p.startsWith('/rest/v1/appointments')));
 assert.equal((await get('settings')).status,403);
 enabled=true;assert.equal((await (await get('settings')).json()).groupme_url,'https://groupme.com/join_group/123/test');
 role='homeowner';assert.equal((await get('status')).status,403);
 assert.equal((await handler.fetch(new Request('https://app.test/api/field?view=status'))).status,401);
 console.log('Actual field endpoint: recipient filters, feature-denied alerts/settings, inactive role and signed-out denial passed');
}finally{globalThis.fetch=originalFetch;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_ANON_KEY;else process.env.SUPABASE_ANON_KEY=oldKey;}
