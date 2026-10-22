import assert from 'node:assert/strict';
import handler from '../api/field.js';

const originalFetch = globalThis.fetch;
const originalEnv = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY };
Object.assign(process.env, { SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'test' });
const me = '11111111-1111-4111-8111-111111111111';
const fieldRep = '22222222-2222-4222-8222-222222222222';
const otherManager = '33333333-3333-4333-8333-333333333333';
const thread = '44444444-4444-4444-8444-444444444444';
const threads = [{ id: thread, rep_id: fieldRep, admin_last_read_at: null }];
const messages = [
  { id: 'manager-outgoing', thread_id: thread, sender_rep_id: otherManager, body: 'Management reply', created_at: '2026-10-22T12:00:00Z' },
  { id: 'field-incoming', thread_id: thread, sender_rep_id: fieldRep, body: 'Field update', created_at: '2026-10-22T11:00:00Z' }
];
let role = 'admin';
let disabled = new Set();
let paths = [];
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(input);
  paths.push(url.pathname + url.search);
  let data = [];
  if (url.pathname === '/auth/v1/user') data = { id: me };
  if (url.pathname === '/rest/v1/reps') data = [{ id: me, role, name: 'Test' }];
  if (url.pathname === '/rest/v1/rpc/password_gate_status') data = { must_change: false, impersonating: false };
  if (url.pathname === '/rest/v1/rpc/feature_enabled') data = !disabled.has(JSON.parse(options.body).requested);
  if (url.pathname === '/rest/v1/message_threads') data = threads;
  if (url.pathname === '/rest/v1/messages') data = messages;
  if (url.pathname === '/rest/v1/shifts') data = [{ id: 'open-shift' }];
  if (url.pathname === '/rest/v1/location_consents') data = [{ consented_at: '2026-10-22T10:00:00Z' }];
  return Response.json(data);
};
const status = async () => {
  const response = await handler.fetch(new Request('https://app.test/api/field?view=status', { headers: { authorization: 'Bearer test' } }));
  assert.equal(response.status, 200);
  return response.json();
};
try {
  for (const managementRole of ['admin', 'manager']) {
    role = managementRole;
    const data = await status();
    assert.equal(data.unread, 1);
    assert.equal(data.latestIncoming?.id, 'field-incoming', 'Management must only receive incoming field messages, not another manager’s replies');
  }
  role = 'appointment_setter';
  disabled = new Set(['messages', 'shifts']);
  paths = [];
  const data = await status();
  assert.equal(data.unread, 0);
  assert.equal(data.latestIncoming, null);
  assert.equal(data.threadId, null);
  assert.equal(data.openShift, null);
  assert.equal(data.consent, null);
  assert.ok(!paths.some(path => /^\/rest\/v1\/(messages|message_threads|shifts|location_consents)(\?|$)/.test(path)), 'Disabled features must not be queried by status polling');
  console.log('Field status: management notification audience and disabled message/shift polling passed');
} finally {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
