import assert from 'node:assert/strict';
import {createAssistantCommandRunner,commandResultText} from '../lib/assistant-command.js';
import {validateMapTool,toolDefinitions} from '../lib/voice-tools.js';
import {createOrbMesh,projectOrbVertex} from '../lib/orb-mesh.js';
for(const role of ['admin','salesperson','appointment_setter']){
 const names=toolDefinitions(role,{map:true})[0].functionDeclarations.map(tool=>tool.name);
 for(const name of ['build_route','clear_route','build_timed_route','remove_route_stop','route_navigation'])assert.ok(names.includes(name));
}
assert.deepEqual(validateMapTool({name:'build_route',args:{count:10,mode:'walking',actorId:'fake'}}),{name:'build_route',args:{count:10,mode:'walking'}});
for(const args of [{count:0},{count:81},{count:2.5},{mode:'flying'},[]])assert.throws(()=>validateMapTool({name:'build_route',args}));
let release,executed=[],authorized=[],events=[];
const run=createAssistantCommandRunner({authorize:async call=>{authorized.push(call.name);if(call.name==='build_route')await new Promise(resolve=>release=resolve);return {authorized:true,execute:call};},execute:async(name)=>{executed.push(name);return {status:name==='clear_route'?'cleared':'built',executed:true};},onStart:c=>events.push(c.name)});
const first=run({name:'build_route'}),second=run({name:'clear_route'});
await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(authorized,['build_route']);assert.deepEqual(executed,[]);
release();await Promise.all([first,second]);assert.deepEqual(executed,['build_route','clear_route']);
const denied=createAssistantCommandRunner({authorize:async()=>{throw Error('Routes disabled');},execute:()=>{throw Error('Must never execute');}});
await assert.rejects(denied({name:'clear_route'}),/Routes disabled/);
let current=true;const stale=createAssistantCommandRunner({isCurrent:()=>current,authorize:async call=>{current=false;return {authorized:true,execute:call};},execute:()=>{throw Error('Must never execute');}});
await assert.rejects(stale({name:'clear_route'}),/cancelled/);
const abort=new AbortController();abort.abort();await assert.rejects(run({name:'clear_route'},{signal:abort.signal}),/cancelled/);
assert.match(commandResultText({status:'opening_map',executed:false}),/Opening/);
assert.match(commandResultText({error:'Route unavailable'}),/unavailable/);
const mesh=createOrbMesh();assert.ok(mesh.vertices.length>400);assert.ok(mesh.triangles.length>900);
for(const face of mesh.triangles)for(const i of face)assert.ok(i>=0&&i<mesh.vertices.length);
for(const vertex of mesh.vertices)assert.ok(Math.abs(Math.hypot(...vertex)-1)<1e-6);
assert.notDeepEqual(projectOrbVertex([1,0,0],0),projectOrbVertex([1,0,0],1));
assert.notDeepEqual(projectOrbVertex([1,0,0],0,0,0),projectOrbVertex([1,0,0],0,.8,0));
console.log('Assistant commands: sequential execution, permission denial, cancellation, model argument validation, truthful results, 3D geometry and audio deformation passed');
