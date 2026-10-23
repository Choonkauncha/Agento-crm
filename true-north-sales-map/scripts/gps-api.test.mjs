import assert from 'node:assert/strict';
import field from '../api/field.js';
const rep='11111111-1111-4111-8111-111111111111',other='33333333-3333-4333-8333-333333333333',shift='22222222-2222-4222-8222-222222222222';
process.env.SUPABASE_URL='https://example.test';process.env.SUPABASE_ANON_KEY='public';
const original=globalThis.fetch;
let role='admin', calls=[], enabled=true;
const shifts=[{id:shift,rep_id:rep,clock_in_at:'2026-10-23T17:00:00Z',clock_out_at:'2026-10-23T17:10:00Z'}];
const points=[0,5,10,15,20,25,30,35,40].map((n,i)=>({id:String(i),rep_id:rep,shift_id:shift,lat:40.7,lng:-82.5,accuracy_m:7,kind:'live',captured_at:new Date(Date.parse(shifts[0].clock_in_at)+n*1000).toISOString()}));
globalThis.fetch=async(url,opts={})=>{
 calls.push({url,opts});const ok=data=>new Response(JSON.stringify(data));
 if(url.endsWith('/auth/v1/user'))return ok({id:rep});
 if(url.includes('password_gate_status'))return ok({must_change:false,impersonating:false});
 if(url.includes('feature_enabled'))return ok(enabled);
 if(url.includes('reps?user_id'))return ok([{id:rep,name:'Travis Mackie',role}]);
 if(url.includes('reps?'))return ok([{id:rep,name:'Travis Mackie',role:'admin',active:true},{id:other,name:'Setter',role:'appointment_setter',active:true}]);
 if(url.includes('/shifts?'))return ok(shifts);
 if(url.includes('/location_points?'))return ok(points);
 if(url.includes('/leads?'))return ok([{id:'house',address:'A House',city:'Mansfield',state:'OH',lat:40.7,lng:-82.5}]);
 throw Error('Unexpected fetch '+url);
};
const get=params=>field.fetch(new Request('https://app.test/api/field?view=gps&date=2026-10-23'+params,{headers:{authorization:'Bearer token'}}));
try{
 let response=await get('');assert.equal(response.status,200);let body=await response.json();assert.equal(body.people.length,2);assert.equal(body.previewRepId,rep);assert.equal(body.people[0].visits.length,0);assert.ok(!calls.some(c=>c.url.includes('/location_points?')),'roster does not load whole history');
 response=await get('&repId='+rep);assert.equal(response.status,200);body=await response.json();assert.equal(body.people[0].visits.length,1);assert.equal(body.people[0].visits[0].duration_seconds,40);assert.equal(body.people[0].liveLocation,null);assert.ok(body.people[0].example);assert.ok(body.people[0].example.visits.every(v=>v.source==='preview'));assert.equal(body.people[0].visits.length,1,'examples do not become recorded GPS visits');
 response=await get('&repId='+rep+'&preview=true');assert.equal(response.status,200);body=await response.json();assert.equal(body.people[0].example.visits.length,11);assert.equal(body.people[0].visits[0].source,'gps');assert.equal(body.people[0].example.visits[0].source,'preview');assert.ok(calls.every(c=>!c.opts.method||c.opts.method==='GET'||c.url.includes('/rpc/')),'preview performs no data writes');
 assert.equal((await get('&repId='+other+'&preview=true')).status,400);
 assert.equal((await get('&repId=invalid')).status,400);
 role='appointment_setter';calls=[];assert.equal((await get('&repId='+rep)).status,403);assert.ok(!calls.some(c=>c.url.includes('/location_points?')));
 role='admin';enabled=false;assert.equal((await get('')).status,403);
 console.log('Users GPS API: management-only roster/detail, no off-shift live marker, truthful visit duration, isolated examples, validation and feature gates passed');
}finally{globalThis.fetch=original;}
