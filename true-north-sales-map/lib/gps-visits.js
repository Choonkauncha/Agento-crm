import { haversineMiles } from './field-rules.js';

// These are observation estimates, never proof that someone entered a property.
export const GPS_RULES = Object.freeze({ radius_m: 30, max_accuracy_m: 25, max_gap_seconds: 20, min_visit_seconds: 30, min_samples: 3 });
const validCoord = p => p?.lat != null && p?.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) && Math.abs(Number(p.lat)) <= 90 && Math.abs(Number(p.lng)) <= 180;
const metres = (a, b) => haversineMiles(Number(a.lat), Number(a.lng), Number(b.lat), Number(b.lng)) * 1609.344;

export function createHouseMatcher(leads, rules = GPS_RULES) {
  const grid = new Map(), byId = new Map();
  const key = (lat, lng) => `${Math.floor(lat * 1000)},${Math.floor(lng * 1000)}`;
  for (const lead of leads || []) {
    if (!lead.id || !validCoord(lead)) continue;
    byId.set(lead.id, lead);
    const k = key(Number(lead.lat), Number(lead.lng));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(lead);
  }
  return point => {
    if (!validCoord(point) || point.accuracy_m == null || !Number.isFinite(Number(point.accuracy_m)) || Number(point.accuracy_m) < 0 || Number(point.accuracy_m) > rules.max_accuracy_m) return null;
    const accuracy = Number(point.accuracy_m);
    // A door action supplies a house identity, but never overrides the distance check.
    const explicit = point.kind === 'door_status' && byId.get(point.lead_id);
    if (explicit && metres(point, explicit) <= rules.radius_m) return explicit;
    const x = Math.floor(Number(point.lat) * 1000), y = Math.floor(Number(point.lng) * 1000);
    const candidates = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const lead of grid.get(`${x + dx},${y + dy}`) || []) {
        const distance = metres(point, lead);
        if (distance <= rules.radius_m + rules.max_accuracy_m) candidates.push({ lead, distance });
      }
    }
    candidates.sort((a,b) => a.distance - b.distance);
    if (!candidates.length || candidates[0].distance > rules.radius_m) return null;
    // Nearby houses within the accuracy uncertainty are intentionally left unmatched.
    if (candidates[1] && candidates[1].distance - candidates[0].distance < Math.max(8, accuracy)) return null;
    return candidates[0].lead;
  };
}

export function summarizeGpsVisits({ points = [], shifts = [], leads = [], dayStart, dayEnd, now = new Date(), rules = GPS_RULES }) {
  const start = +new Date(dayStart), end = Math.min(+new Date(dayEnd), +now);
  const match = createHouseMatcher(leads, rules);
  const visits = [], gaps = [];
  let matched = 0, unmatched = 0;
  for (const shift of shifts) {
    const shiftStart = Math.max(start, +new Date(shift.clock_in_at));
    const shiftEnd = Math.min(end, shift.clock_out_at ? +new Date(shift.clock_out_at) : end);
    if (!Number.isFinite(shiftStart) || !Number.isFinite(shiftEnd) || shiftEnd < shiftStart) continue;
    const ordered = points.filter(p => p.shift_id === shift.id && p.rep_id === shift.rep_id && Number.isFinite(+new Date(p.captured_at)) && +new Date(p.captured_at) >= shiftStart && +new Date(p.captured_at) <= shiftEnd).slice().sort((a,b) => +new Date(a.captured_at) - +new Date(b.captured_at) || Number(b.kind === 'door_status') - Number(a.kind === 'door_status'));
    let candidate = null, previous = null;
    const finish = status => {
      if (candidate && candidate.samples >= rules.min_samples && candidate.last - candidate.first >= rules.min_visit_seconds * 1000) {
        const lead = candidate.lead;
        visits.push({ id: `${shift.id}:${lead.id}:${candidate.first}`, shift_id: shift.id, lead_id: lead.id, address: lead.full_address || [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', '), lat: Number(lead.lat), lng: Number(lead.lng), arrived_at: new Date(candidate.first).toISOString(), departed_at: new Date(candidate.last).toISOString(), duration_seconds: Math.floor((candidate.last - candidate.first) / 1000), sample_count: candidate.samples, accuracy_m: candidate.accuracy, source: 'gps', confidence: 'estimated', status });
      }
      candidate = null;
    };
    for (const point of ordered) {
      const time = +new Date(point.captured_at);
      if (previous != null && time === previous) continue;
      if (previous == null && time - shiftStart > rules.max_gap_seconds * 1000) {
        gaps.push({ shift_id: shift.id, started_at: new Date(shiftStart).toISOString(), ended_at: point.captured_at, duration_seconds: Math.floor((time - shiftStart)/1000) });
      }
      if (previous != null && time - previous > rules.max_gap_seconds * 1000) {
        gaps.push({ shift_id: shift.id, started_at: new Date(previous).toISOString(), ended_at: point.captured_at, duration_seconds: Math.floor((time - previous)/1000) });
        finish('signal_lost');
      }
      previous = time;
      const lead = match(point);
      if (!lead) { unmatched++; finish('completed'); continue; }
      matched++;
      if (candidate?.lead.id !== lead.id) {
        finish('completed');
        candidate = { lead, first: time, last: time, samples: 1, accuracy: Number(point.accuracy_m) };
      } else {
        candidate.last = time; candidate.samples++; candidate.accuracy = Math.max(candidate.accuracy, Number(point.accuracy_m));
      }
    }
    if (previous == null || shiftEnd - previous > rules.max_gap_seconds * 1000) {
      const gapStart = previous ?? shiftStart;
      if (shiftEnd > gapStart) gaps.push({ shift_id: shift.id, started_at: new Date(gapStart).toISOString(), ended_at: new Date(shiftEnd).toISOString(), duration_seconds: Math.floor((shiftEnd - gapStart)/1000) });
      finish('signal_lost');
    } else finish(!shift.clock_out_at && +now - previous <= rules.max_gap_seconds * 1000 ? 'ongoing' : 'completed');
  }
  return { visits, gaps, matched_samples: matched, unmatched_samples: unmatched, rules, estimated: true };
}

export function currentGpsLocation(points, shifts, now = new Date()) {
  const time = +now;
  return points.filter(p => validCoord(p) && p.accuracy_m != null && Number.isFinite(Number(p.accuracy_m)) && Number(p.accuracy_m) >= 0 && Number(p.accuracy_m) <= GPS_RULES.max_accuracy_m && shifts.some(s => s.id === p.shift_id && s.rep_id === p.rep_id && !s.clock_out_at && +new Date(s.clock_in_at) <= +new Date(p.captured_at)) && time - +new Date(p.captured_at) <= GPS_RULES.max_gap_seconds * 1000 && time >= +new Date(p.captured_at)).sort((a,b) => +new Date(b.captured_at) - +new Date(a.captured_at))[0] || null;
}
