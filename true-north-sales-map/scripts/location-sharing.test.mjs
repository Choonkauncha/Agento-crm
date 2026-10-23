import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../field-ops.js', import.meta.url), 'utf8');
const code = source.slice(source.indexOf('function canClockIn('), source.indexOf('function hostForWidget()'));
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness({ admin = false, pendingUpload = false } = {}) {
  let now = 100000, watch, errorCallback, tick, sample, resolveUpload;
  const writes = [], cleared = [], events = {}, options = [];
  const state = { token: 'token', status: { isField: !admin, isAdmin: admin, canClockIn: true,
    openShift: { id: 'shift' }, consent: { notice_version: 'current' } }, locationWatch: null };
  const document = { hidden: false, getElementById: () => null, addEventListener: (name, cb) => { events[name] = cb; } };
  const Clock = class extends Date { static now() { return now; } };
  const ctx = vm.createContext({ state, document, Date: Clock, AbortController, NOTICE_VERSION: 'current',
    setInterval: (cb, ms) => { tick = cb; assert.equal(ms, 5000); return 9; }, clearInterval: () => {},
    window: { addEventListener: (name, cb) => { events[name] = cb; } },
    navigator: { geolocation: {
      watchPosition: (cb, error, opt) => { watch = cb; errorCallback = error; options.push(opt); return 7; },
      clearWatch: id => cleared.push(id),
      getCurrentPosition: (cb, error, opt) => { sample = cb; options.push(opt); }
    } },
    api: async (path, request) => {
      writes.push(request);
      if (pendingUpload) await new Promise(resolve => { resolveUpload = resolve; });
    }, toast: () => {}, locationAccessMessage: () => 'Location unavailable' });
  vm.runInContext(code, ctx);
  const run = expression => vm.runInContext(expression, ctx);
  const fix = ({ age = 0, accuracy = 10 } = {}) => ({ timestamp: now - age,
    coords: { latitude: 40, longitude: -82, accuracy } });
  run('syncLocationSharing()');
  return { state, document, writes, cleared, events, options, fix, run,
    watch: position => watch(position), error: error => errorCallback(error),
    tick: () => tick(), sample: position => sample(position), advance: ms => { now += ms; },
    resolveUpload: () => resolveUpload?.() };
}
{
  const h = harness();
  h.watch(h.fix()); await flush();
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].body.shiftId, 'shift');
  assert.equal(h.writes[0].body.capturedAt, new Date(100000).toISOString());
  h.watch(h.fix()); await flush(); assert.equal(h.writes.length, 1, 'Duplicate fix is not replayed');
  h.advance(5000); h.tick(); await flush();
  assert.equal(h.writes.length, 1, 'A stationary heartbeat requests a new sample');
  h.sample(h.fix()); await flush(); assert.equal(h.writes.length, 2);
  h.advance(5000); h.watch(h.fix({ age: 20000 })); await flush();
  assert.equal(h.writes.length, 2, 'Stale GPS timestamp is rejected');
  assert.match(h.state.locationStatus, /fresh fix/);
  assert.ok(h.options.every(opt => opt.enableHighAccuracy === true && opt.maximumAge === 0));
  const late = h.fix();
  h.state.status.openShift = null; h.run('syncLocationSharing()');
  assert.deepEqual(h.cleared, [7]);
  h.watch(late); h.tick(); await flush(); assert.equal(h.writes.length, 2, 'No clocked-out uploads');
}
{
  const h = harness({ admin: true });
  h.watch(h.fix()); await flush();
  assert.equal(h.writes.length, 1, 'Admins participate when server grants canClockIn');
  h.document.hidden = true; h.events.visibilitychange();
  h.advance(5000); h.watch(h.fix()); await flush(); assert.equal(h.writes.length, 1);
  assert.equal(h.state.locationShift, null);
  assert.match(h.state.locationStatus, /hidden/);
  h.document.hidden = false; h.events.visibilitychange();
  h.watch(h.fix()); await flush(); assert.equal(h.writes.length, 2, 'Visible app resumes with fresh sample');
}
{
  const h = harness({ pendingUpload: true });
  h.watch(h.fix()); await flush();
  const signal = h.writes[0].signal;
  h.run('stopLocationSharing()');
  assert.equal(signal.aborted, true, 'Stopping cancels an in-flight upload');
  h.resolveUpload(); await flush();
  assert.equal(h.state.locationSentAt, 0, 'Old upload completion cannot revive stopped state');
}
{
  const h = harness();
  h.error({ code: 1 });
  assert.equal(h.state.locationBlocked, true);
  assert.match(h.state.locationStatus, /permission blocked/);
  h.run('syncLocationSharing()'); assert.equal(h.state.locationShift, null, 'No automatic permission retry loop');
}
{
  const h = harness();
  h.watch(h.fix()); await flush();
  h.state.token = 'refreshed-token';
  h.advance(5000); h.watch(h.fix()); await flush();
  assert.equal(h.writes.length, 2, 'Token rotation keeps the same shift tracking');
  h.state.clockBusy = true;
  h.run('syncLocationSharing()');
  h.advance(5000); h.watch(h.fix()); await flush();
  assert.equal(h.writes.length, 2, 'Pending clock-out cannot restart location polling');
}
console.log('Shift GPS: fresh timestamps, precise stationary samples, admins, visibility pause/resume, cancellation, stale callbacks and permission denial passed');
