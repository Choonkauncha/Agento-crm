import assert from 'node:assert/strict';
import { createHouseMatcher, summarizeGpsVisits, currentGpsLocation } from '../lib/gps-visits.js';
const base = Date.parse('2026-10-23T14:00:00Z');
const iso = seconds => new Date(base + seconds * 1000).toISOString();
const house = { id: 'home-a', address: '100 Main Street', city: 'Mansfield', state: 'OH', lat: 40.75, lng: -82.5 };
const nearby = { ...house, id: 'home-b', address: '102 Main Street', lng: -82.49985 };
const other = { ...house, id: 'home-c', address: '104 Main Street', lat: 40.752 };
const shift = { id: 'shift-a', rep_id: 'rep-a', clock_in_at: iso(0), clock_out_at: iso(180) };
const point = (seconds, overrides = {}) => ({ id: `p-${seconds}`, rep_id: shift.rep_id, shift_id: shift.id,
  captured_at: iso(seconds), lat: house.lat, lng: house.lng, accuracy_m: 5, kind: 'live', ...overrides });
const summarize = (points, options = {}) => summarizeGpsVisits({ points, shifts: [shift], leads: [house, other],
  dayStart: iso(0), dayEnd: iso(86400), now: new Date(iso(180)), ...options });
const samples = (start, stop, overrides = {}) => {
  const rows = [];
  for (let sec = start; sec <= stop; sec += 5) rows.push(point(sec, overrides));
  return rows;
};
{
  const rows = samples(5, 65).map((p, i) => ({ ...p, lat: p.lat + (i % 2 ? 0.000025 : -0.000025), lng: p.lng + (i % 3 ? 0.000015 : -0.000015) }));
  const result = summarize(rows);
  assert.equal(result.visits.length, 1, 'Ordinary GPS jitter stays one visit');
  assert.equal(result.visits[0].duration_seconds, 60);
  assert.equal(result.visits[0].sample_count, 13);
  assert.equal(result.visits[0].lead_id, house.id);
  assert.equal(result.visits[0].status, 'signal_lost');
}
{
  const match = createHouseMatcher([house, nearby]);
  assert.equal(match(point(5, { lng: -82.499925, accuracy_m: 15 })), null, 'Ambiguous adjacent houses stay unmatched');
  assert.equal(summarize(samples(0, 60, { lng: -82.499925, accuracy_m: 15 }), { leads: [house, nearby] }).visits.length, 0);
  assert.equal(match(point(5, { kind: 'door_status', lead_id: nearby.id, lng: -82.499925, accuracy_m: 15 }))?.id, nearby.id,
    'Explicit door identity disambiguates a nearby house');
  assert.equal(match(point(5, { kind: 'door_status', lead_id: nearby.id, lat: house.lat + 0.01 })), null,
    'Explicit door identity cannot override distance');
  assert.equal(match(point(5, { lead_id: nearby.id, lng: -82.499925, accuracy_m: 15 })), null,
    'Only door events supply explicit identity');
}
{
  assert.equal(summarize(samples(0, 25)).visits.length, 0, 'Short drive-bys do not count as visits');
  assert.equal(summarize([point(0), point(15), point(30)]).visits.length, 1, 'Minimum dwell with three independent observations qualifies');
  assert.equal(summarize([point(0), point(30)]).visits.length, 0, 'Sparse samples cannot bridge a long gap');
  assert.equal(summarize([point(0), point(15), point(15), point(30)]).visits[0].sample_count, 3,
    'Duplicate capture timestamps do not inflate evidence');
}
{
  const result = summarize([...samples(0, 30), ...samples(90, 120)]);
  assert.equal(result.visits.length, 2);
  assert.equal(result.visits.reduce((sum, visit) => sum + visit.duration_seconds, 0), 60,
    'Missing observations are not credited as time at a house');
  assert.equal(result.gaps.find(gap => gap.started_at === iso(30))?.duration_seconds, 60);
  const initial = summarize(samples(60, 90));
  assert.equal(initial.gaps[0].started_at, iso(0), 'Missing GPS after clock-in is exposed');
  assert.equal(initial.gaps[0].duration_seconds, 60);
  const empty = summarize([]);
  assert.equal(empty.visits.length, 0);
  assert.equal(empty.gaps[0].duration_seconds, 180);
}
{
  const rows = [point(-5), ...samples(0, 30), point(181), point(15, { shift_id: 'someone-else' }), point(20, { rep_id: 'someone-else' })];
  const result = summarize(rows);
  assert.equal(result.matched_samples, 7, 'Off-shift and other-user records are excluded');
  assert.equal(result.visits[0].arrived_at, iso(0));
  assert.equal(result.visits[0].departed_at, iso(30));
  assert.equal(currentGpsLocation(samples(150, 180), [shift], new Date(iso(180))), null, 'Clocked-out users have no live marker');
}
{
  const active = { ...shift, clock_out_at: null };
  const result = summarize(samples(150, 180), { shifts: [active] });
  assert.equal(result.visits[0].status, 'ongoing');
  assert.equal(result.visits[0].duration_seconds, 30, 'An ongoing visit credits only observed time');
  assert.equal(currentGpsLocation(samples(150, 180), [active], new Date(iso(180)))?.captured_at, iso(180));
  assert.equal(currentGpsLocation([point(150)], [active], new Date(iso(180))), null, 'Stale live markers disappear');
  assert.equal(currentGpsLocation([point(181)], [active], new Date(iso(180))), null, 'Future fixes are not live');
  assert.equal(currentGpsLocation([point(-1)], [active], new Date(iso(0))), null, 'Pre-shift fix is not live');
  assert.equal(currentGpsLocation([point(180, { rep_id: 'other' })], [active], new Date(iso(180))), null);
  for (const accuracy of [null, undefined, -1, NaN, Infinity, 26]) {
    assert.equal(currentGpsLocation([point(180, { accuracy_m: accuracy })], [active], new Date(iso(180))), null,
      `Invalid/insufficient accuracy ${accuracy} cannot be live`);
    assert.equal(summarize(samples(0, 60, { accuracy_m: accuracy })).visits.length, 0);
  }
  assert.equal(currentGpsLocation([point(180, { lat: null })], [active], new Date(iso(180))), null);
}
{
  const boundary = Date.parse('2026-10-24T04:00:00Z'); // Eastern midnight.
  const t = seconds => new Date(boundary + seconds * 1000).toISOString();
  const rows = [-30, -20, -10, 0, 10, 20, 30].map(seconds => ({ ...point(0), captured_at: t(seconds) }));
  const spanning = { ...shift, clock_in_at: t(-60), clock_out_at: t(60) };
  const today = summarizeGpsVisits({ points: rows, shifts: [spanning], leads: [house],
    dayStart: t(0), dayEnd: t(86400), now: new Date(t(100)) });
  assert.equal(today.visits.length, 1);
  assert.equal(today.visits[0].arrived_at, t(0));
  assert.equal(today.visits[0].duration_seconds, 30, 'Cross-midnight shifts count only the requested day');
  const yesterday = summarizeGpsVisits({ points: rows, shifts: [spanning], leads: [house],
    dayStart: t(-86400), dayEnd: t(0), now: new Date(t(100)) });
  assert.equal(yesterday.visits[0].duration_seconds, 30);
}
{
  const result = summarize([
    point(0, { lng: -82.499925, accuracy_m: 15 }),
    ...[0, 15, 30].map(seconds => point(seconds, { kind: 'door_status', lead_id: nearby.id, lng: -82.499925, accuracy_m: 15 }))
  ], { leads: [house, nearby] });
  assert.equal(result.visits[0]?.lead_id, nearby.id, 'Same-time door observation retains explicit house identity');
}
console.log('GPS visits: jitter, ambiguity, door matching, dwell thresholds, sparse gaps, off-shift exclusion, live freshness, accuracy and midnight clipping passed');
