import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

const start = html.indexOf('<div id="doorSheet"');
const end = html.indexOf('<div id="toast"');
assert.ok(start > -1 && end > start, 'door sheet markup exists');
const sheet = html.slice(start, end);

// Sheet keeps its fallback controls; visible actions are mounted when a house opens.
assert.match(sheet, /id="doorSheetAddress"/);
assert.match(sheet, /<select id="doorSheetAnswer"[^>]*>[\s\S]*>Answered<\/option>[\s\S]*>No Answer<\/option><\/select>/);
assert.match(sheet, /id="doorSheetRoute"[^>]*>Add to route</);
assert.match(sheet, /id="doorSheetForm"[^>]*>File form</);
for (const gone of ['doorSheetName', 'doorSheetPlace', 'doorSheetStatus', 'doorSheetActions', 'doorSheetFull', 'doorSheetBook', 'THIS DOOR', 'Current status', 'Book Inspection', 'Full record']) {
  assert.ok(!sheet.includes(gone), `door sheet no longer shows ${gone}`);
}
const controls = sheet.match(/<(button|a|select|input|textarea)\b[^>]*>/g) || [];
assert.deepEqual(controls.map((tag) => (tag.match(/id="([^"]+)"/) || [])[1]), ['doorSheetScrim', 'doorSheetClose', 'doorSheetAnswer', 'doorSheetRoute', 'doorSheetForm']);

// Answer dropdown maps onto existing lead statuses and saves through applyDoorStatus.
assert.match(app, /const DOOR_ANSWERS=\[\['Answered','Knocked'\],\['No Answer','No Answer'\]\];/);
assert.match(app, /\$\('doorSheetAnswer'\)\.onchange=\(\)=>\{[^}]*applyDoorStatus\(id,value\)/);
assert.match(app, /\$\('doorSheetForm'\)\.href=houseFormHref\(l\)/);

// Desktop map popup: same three controls only.
const popup = app.slice(app.indexOf('function pinPopupHtml'), app.indexOf('function bindPinPopup'));
assert.match(popup, /data-popup-answer=/);
assert.match(popup, /data-popup-route=/);
assert.match(popup, />File form<\/a>/);
for (const gone of ['Open lead', 'scoreLead', 'miniBadge', 'lead.name']) assert.ok(!popup.includes(gone), `desktop popup no longer shows ${gone}`);

assert.match(popup, /addressActions\(lead\)/);
assert.match(app, /actions.innerHTML=addressActions\(l\)/);
console.log('House popup retains status persistence and mounts clear address actions');
