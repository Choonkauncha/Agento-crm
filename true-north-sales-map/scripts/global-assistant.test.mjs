import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {clampOrbPosition} from '../tn-files/orb-position.js';
const root=new URL('../',import.meta.url);
for(const file of readdirSync(root).filter(file=>file.endsWith('.html'))){
 const html=readFileSync(new URL(file,root),'utf8');assert.equal(html.split('src="/tn-files/global-assistant.js"').length-1,1,`${file} must load one shared overlay`);
}
assert.deepEqual(clampOrbPosition(-50,-50,390,844,64),{x:8,y:8});
assert.deepEqual(clampOrbPosition(999,999,390,844,64),{x:318,y:772});
const position=clampOrbPosition(200,400,320,500,82);assert.ok(position.x>=8&&position.x<=230&&position.y<=410);
const code=readFileSync(new URL('../tn-files/global-assistant.js',import.meta.url),'utf8');
assert.ok(code.includes('guest();'));assert.ok(code.includes('client.auth.getUser()'));assert.ok(code.includes('pending.userId!==mapContext.rep.user_id'));assert.ok(code.includes("/api/coach"));
console.log('All-screen overlay inclusion, drag bounds and authenticated command handoff checks passed');
