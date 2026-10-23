import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../tn-files/users-gps.js', import.meta.url), 'utf8');
const now = Date.parse('2026-10-23T18:00:00Z');
class Clock extends Date { static now() { return now; } }
const state = { locationUnavailable: false };
const helpers = vm.runInNewContext(source.slice(source.indexOf('const pointTime ='), source.indexOf('function destroyMap()')) + '\n({ liveState, displayedVisits, visitStats, duration });', { state, Date: Clock });
const person = { shifts: [{ id: 'SHIFT', clock_out_at: null }], visits: [{ id: 'recorded', arrived_at: new Date(now - 3000).toISOString(), duration_seconds: 120, source: 'gps' }], example: { visits: [{ id: 'entered', arrived_at: new Date(now - 9000).toISOString(), duration_seconds: 600 }] }, liveLocation: { lat: 40.7, lng: -82.5, captured_at: new Date(now - 5000).toISOString(), accuracy_m: 8 } };
assert.equal(helpers.liveState(person).fresh, true);
person.liveLocation.captured_at = new Date(now - 20000).toISOString();
assert.equal(helpers.liveState(person).fresh, true);
person.liveLocation.captured_at = new Date(now - 20001).toISOString();
assert.equal(helpers.liveState(person).fresh, false, 'a position must expire locally even when the API does not answer');
person.liveLocation.captured_at = new Date(now).toISOString();
for (const accuracy of [null, -1, 25.01, NaN, Infinity]) { person.liveLocation.accuracy_m = accuracy; assert.equal(helpers.liveState(person).fresh, false, `reject uncertain accuracy ${accuracy}`); }
person.liveLocation.accuracy_m = 8;
state.locationUnavailable = true;
assert.equal(helpers.liveState(person).fresh, false, 'failed refresh must not keep a live/green location');
state.locationUnavailable = false;
person.shifts[0].clock_out_at = new Date(now).toISOString();
assert.equal(helpers.liveState(person).fresh, false, 'clock-out suppresses a still-fresh point');
assert.match(helpers.liveState(person).label, /sharing stopped/);
const timeline = helpers.displayedVisits(person);
assert.equal(timeline.length, 2, 'entered and GPS entries share the normal timeline');
assert.equal(timeline[0].id, 'entered', 'timeline sorts all entries by arrival');
assert.equal(timeline[0].source, 'preview', 'entered records retain internal provenance');
assert.equal(timeline[1].id, 'recorded');
assert.equal(person.visits.length, 1, 'timeline merge does not mutate actual GPS records');
assert.equal(person.example.visits[0].source, undefined, 'provenance normalization does not mutate fixture');
const totals = helpers.visitStats(person);
assert.equal(totals.count, 1, 'only real GPS visits count toward matched visits');
assert.equal(totals.seconds, 120, 'entered durations never inflate observed GPS time');
assert.equal(totals.examples, 1);
assert.equal(helpers.displayedVisits({ visits: person.visits }).length, 1);
assert.equal(helpers.duration(null), 'Unavailable');
assert.equal(helpers.duration(120), '2m 0s');
assert.equal(helpers.duration(3670), '1h 1m');
console.log('Users GPS local freshness, accuracy, clock-out, refresh failure and merged timeline provenance and recorded-total isolation passed.');

// Check the actual detail markup without depending on a browser executable.
const nodes = new Map();
const document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', hidden: false, classList: { toggle() {} } }); return nodes.get(id); } };
const uiState = { ...state, selected: 'admin', date: '2026-10-23', detailOpen: true, data: { people: [{ ...person, rep: { id: 'admin', name: 'Admin', role: 'admin' } }] } };
const render = vm.runInNewContext(source.slice(source.indexOf('function renderDetail('), source.indexOf('function renderMap(')) + '\nrenderDetail;', {
  state: uiState, document, displayedVisits: helpers.displayedVisits, visitStats: helpers.visitStats, liveState: helpers.liveState, duration: helpers.duration,
  esc: value => String(value ?? '').replaceAll('<', '&lt;').replaceAll('>', '&gt;'), roleLabel: value => value, stamp: value => value,
  finiteCoord: () => false, renderMap() {},
});
render();
const detail = document.getElementById('gpsVisits').innerHTML;
assert.equal((detail.match(/class="gpsVisit"/g) || []).length, 2, 'one timeline includes entered and GPS visits');
assert.match(detail, /data-source="preview"/, 'source remains available internally');
assert.doesNotMatch(detail, /Example|Entered stop|Entered duration|manually entered|gpsVisitDetails/, 'source labels are absent from visible timeline');
assert.doesNotMatch(document.getElementById('gpsDetailHead').innerHTML, /gpsBadge preview/, 'no example badge appears');
const fixture = JSON.parse(readFileSync(new URL('../data/gps-preview.json', import.meta.url), 'utf8'));
assert.equal(fixture.visits.length, 11);
assert.equal(fixture.visits[0].arrived_at, '2026-10-23T16:30:00-04:00');
assert.equal(fixture.visits.at(-1).departed_at, '2026-10-23T18:00:00-04:00');
assert.equal(new Set(fixture.visits.map(v => v.lead_id)).size, 11);
for (const visit of fixture.visits) assert.equal(visit.duration_seconds, (Date.parse(visit.departed_at) - Date.parse(visit.arrived_at)) / 1000);
console.log('Users GPS detail rendering and eleven-visit schedule passed.');
