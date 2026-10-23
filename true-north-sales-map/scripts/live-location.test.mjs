import assert from 'node:assert/strict';
import field from '../api/field.js';
const rep='11111111-1111-4111-8111-111111111111', shift='22222222-2222-4222-8222-222222222222';
process.env.SUPABASE_URL='https://example.test';process.env.SUPABASE_ANON_KEY='public';
const originalFetch=globalThis.fetch;
let role='appointment_setter', open=true, consent=true, writes=[];
globalThis.fetch=async (url,options={})=>{
 const response=data=>new Response(JSON.stringify(data));
 if(url.endsWith('/auth/v1/user')) return response({id:rep});
 if(url.includes('reps?'))return response([{id:rep,name:'Setter',role}]);
 if(url.includes('password_gate_status'))return response({must_change:false,impersonating:false});
 if(url.includes('feature_enabled'))return response(true);
 if(url.includes('location_consents?'))return response(consent?[{id:'consent'}]:[]);
 if(url.includes('shifts?'))return response(open?[{id:shift}]:[]);
 if(url.endsWith('/location_points')){writes.push(JSON.parse(options.body));return response([{id:'point'}]);}
 throw new Error('Unexpected fetch '+url);
};
async function post(body){return field.fetch(new Request('https://app.test/api/field',{method:'POST',headers:{authorization:'Bearer token','content-type':'application/json'},body:JSON.stringify(body)}));}
try{
 const body={action:'location',shiftId:shift,lat:40.39,lng:-82.48,accuracy:15};
 assert.equal((await post(body)).status,200);
 assert.equal(writes[0].kind,'live');assert.equal(writes[0].shift_id,shift);
 writes=[];open=false;assert.equal((await post(body)).status,409);assert.equal(writes.length,0);
 open=true;assert.equal((await post({...body,shiftId:rep})).status,409);
 consent=false;assert.equal((await post(body)).status,403);
 consent=true;role='admin';assert.equal((await post(body)).status,200);
 role='manager';assert.equal((await post(body)).status,200);
 role='appointment_setter';
 assert.equal((await post({...body,capturedAt:new Date(Date.now()-60000).toISOString()})).status,400);
 assert.equal((await post({...body,capturedAt:new Date(Date.now()+60000).toISOString()})).status,400);
 assert.equal((await post({...body,capturedAt:'bad'})).status,400);
 writes=[];
 role='appointment_setter';assert.equal((await post({...body,lat:null,lng:null})).status,400);
 open=false;assert.equal((await post({action:'clock-in'})).status,400);assert.equal(writes.length,0);
 console.log('Live locations: team/admin access, consent, shift ownership, closed-shift refusal, stale/future refusal and GPS requirement passed');
}finally{globalThis.fetch=originalFetch;}
