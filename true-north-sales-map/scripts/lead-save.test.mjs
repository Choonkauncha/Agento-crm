import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const saveSource = source.slice(source.indexOf('async function persistLeadPatch('), source.indexOf('function openLead('));

for (const failure of ['response', 'network']) {
  const original = { id: 'house', status: 'New', notes: 'Original note', assignedRepId: 'original-rep' };
  const lead = { ...original };
  const error = new Error(failure === 'response' ? 'Save denied' : 'Network unavailable');
  const alerts = [], activities = [], captures = [];
  let payload;
  const context = vm.createContext({
    state: { mode: 'cloud', currentRep: { id: 'rep' }, supabase: { from: () => ({ update: value => {
      payload = value;
      return { eq: async () => {
        // An unrelated update during the request must survive a failed save.
        lead.phone = '7405550123';
        if (failure === 'network') throw error;
        return { error };
      } };
    } }) } },
    leadStatus: row => row.status, nowISO: () => '2026-10-22T12:00:00Z',
    alert: message => alerts.push(message), logActivity: (...args) => activities.push(args),
    window: { TrueNorthField: { captureDoorStatus: value => captures.push(value) } }
  });
  vm.runInContext(saveSource, context);
  await assert.rejects(context.persistLeadPatch(lead, { status: 'Knocked', assignedRepId: 'new-rep', roofAgeYears: 20, notes: 'Changed' }), error);
  assert.deepEqual(lead, { ...original, phone: '7405550123' }, 'failed saves restore fields and remove new aliases without erasing unrelated updates');
  assert.equal(payload.assigned_rep_id, 'new-rep');
  assert.equal(payload.updated_by, 'rep');
  assert.deepEqual(alerts, [error.message]);
  assert.deepEqual(activities, [], 'failed status updates cannot create activity records');
  assert.deepEqual(captures, []);
}

const saved = { id: 'saved-house', status: 'New' };
const activities = [], captures = [];
const context = vm.createContext({
  state: { mode: 'cloud', currentRep: { id: 'rep' }, supabase: { from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) } },
  leadStatus: row => row.status, nowISO: () => '2026-10-22T12:00:00Z', alert() { throw Error('Unexpected alert'); },
  logActivity: async (...args) => activities.push(args),
  window: { TrueNorthField: { captureDoorStatus: value => captures.push(value) } }
});
vm.runInContext(saveSource, context);
await context.persistLeadPatch(saved, { status: 'No Answer' });
assert.equal(saved.status, 'No Answer');
assert.equal(activities.length, 1);
assert.equal(captures[0].status, 'No Answer');
console.log('Field save rollback, network failures, aliases, activity and successful status updates passed.');
