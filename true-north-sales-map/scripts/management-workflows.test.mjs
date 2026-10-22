import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { adminHashTarget, filesHashTarget, activateAdminTab, bindAdminTabs } from '../lib/admin-tabs.js';

for (const hash of ['#%', '#%E0%A4%A', '#unavailable']) {
  assert.deepEqual(adminHashTarget(hash), { tab: '', messages: false, builder: false });
}
assert.equal(adminHashTarget('#coach-settings').tab, 'coach-settings');
for (const hash of ['#receipts', '#estimates']) assert.equal(adminHashTarget(hash).tab, 'files');
assert.deepEqual(filesHashTarget('#property=123%20Main%20%26%20Oak'), { view: 'property', propertyKey: '123 Main & Oak' });
assert.deepEqual(filesHashTarget('#property=%E0%A4%A'), { view: 'documents', propertyKey: '' });
assert.deepEqual(filesHashTarget('#files'), { view: 'documents', propertyKey: '' });
assert.deepEqual(filesHashTarget('#builder'), { view: 'builder', propertyKey: '' });
assert.deepEqual(filesHashTarget('#library'), { view: 'library', propertyKey: '' });
assert.equal(filesHashTarget('#team'), null);

function element(id, tab, hidden = false) {
  const classes = new Set(hidden ? ['hidden'] : []), attrs = new Map(), handlers = new Map();
  return {
    id, dataset: tab ? { tab } : {},
    classList: { contains: name => classes.has(name), toggle(name, on) { if (on) classes.add(name); else classes.delete(name); } },
    setAttribute: (name, value) => attrs.set(name, value), removeAttribute: name => attrs.delete(name),
    getAttribute: name => attrs.get(name),
    addEventListener: (name, handler) => handlers.set(name, handler), click: () => handlers.get('click')?.(),
  };
}
const tabs = ['overview', 'appointments', 'accounts', 'files'];
const sections = tabs.map((tab, i) => element(`tab-${tab}`, null, i !== 0));
const buttons = tabs.map(tab => element('', tab));
const events = [], visits = ['#overview'];
let cursor = 0;
const view = {
  location: { hash: '#overview' }, scrollTo() {},
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  history: {
    pushState(_state, _title, hash) { visits.splice(++cursor); visits.push(hash); view.location.hash = hash; },
    replaceState(_state, _title, hash) { visits[cursor] = hash; view.location.hash = hash; },
  },
};
const root = {
  defaultView: view, getElementById: id => sections.find(section => section.id === id),
  querySelectorAll: selector => selector === '[data-tab]' ? buttons : selector.startsWith('main ') ? sections : [],
  dispatchEvent: event => events.push(event),
};
bindAdminTabs(root, tab => activateAdminTab(root, tab));
bindAdminTabs(root, tab => activateAdminTab(root, tab));
buttons[1].click(); buttons[2].click();
assert.deepEqual(visits, ['#overview', '#appointments', '#accounts']);
assert.equal(buttons[2].getAttribute('aria-current'), 'page');
assert.equal(buttons[1].getAttribute('aria-current'), undefined);
assert.equal(sections[2].classList.contains('hidden'), false);
assert.equal(sections[1].classList.contains('hidden'), true);
// A browser Back event restores a destination without creating another history entry.
view.location.hash = visits[--cursor];
activateAdminTab(root, adminHashTarget(view.location.hash).tab, { historyMode: 'none' });
assert.deepEqual(visits, ['#overview', '#appointments', '#accounts']);
assert.equal(sections[1].classList.contains('hidden'), false);
// A dynamic module's click loader may run during hash replay without duplicating history.
activateAdminTab(root, 'appointments');
assert.equal(visits.length, 3);
// Unsupported/unmounted destinations must leave the current screen usable.
assert.equal(activateAdminTab(root, 'missing'), false);
assert.equal(sections[1].classList.contains('hidden'), false);
assert.equal(view.location.hash, '#appointments');
view.location.hash = '#builder';
activateAdminTab(root, 'files', { historyMode: 'none' });
assert.equal(view.location.hash, '#builder');
assert.equal(events.at(-1).detail, 'files');
assert.equal(sections[3].classList.contains('hidden'), false);
// Duplicate auth notifications during boot must share a single dashboard hydration.
const dashboardSource = readFileSync(new URL('../admin-dashboard.js', import.meta.url), 'utf8');
const enterSource = dashboardSource.slice(dashboardSource.indexOf('function enter(s)'), dashboardSource.indexOf('async function enterSession(s)'));
const pending = [];
const context = vm.createContext({
  enterFlight: null, enteringUserId: null, session: null,
  enterSession: session => new Promise((resolve, reject) => pending.push({ id: session.user.id, resolve, reject })),
});
vm.runInContext(`${enterSource};globalThis.enter = enter;`, context);
const initial = context.enter({ user: { id: 'admin-a' }, access_token: 'old' });
const duplicate = context.enter({ user: { id: 'admin-a' }, access_token: 'fresh' });
assert.equal(pending.length, 1);
assert.equal(context.session.access_token, 'fresh');
pending[0].reject(new Error('Dashboard unavailable'));
await assert.rejects(initial, /Dashboard unavailable/);
await assert.rejects(duplicate, /Dashboard unavailable/);
const retry = context.enter({ user: { id: 'admin-a' } });
assert.equal(pending.length, 2);
pending[1].resolve(); await retry;
// Account invalidation detaches pending refreshes and clears data before redirecting.
const app = { hidden: false };
const invalidation = vm.createContext({
  dashboardEpoch: 4, refreshFlight: Promise.resolve(), refreshAgain: true, refreshLeadsNext: true,
  changedTables: new Set(['leads']), me: { id: 'old-admin' }, session: { user: { id: 'old-admin' } },
  reps: ['old'], leads: ['old'], appointments: ['old'], activities: ['old'], homes: ['old'], territories: ['old'],
  index: 'old', dashboardIndex: () => 'empty', $: id => id === 'app' ? app : null,
  refreshTimer: null, clearTimeout() {}, adminChannel: null, sb: null,
  document: { documentElement: { dataset: {} } }, location: { replace() {} },
});
const invalidateSource = dashboardSource.slice(dashboardSource.indexOf('function leaveAdmin()'), dashboardSource.indexOf('function rememberAdminRole'));
vm.runInContext(`${invalidateSource};leaveAdmin();`, invalidation);
assert.equal(invalidation.dashboardEpoch, 5);
assert.equal(invalidation.refreshFlight, null);
assert.equal(invalidation.refreshAgain, false);
assert.equal(invalidation.refreshLeadsNext, false);
assert.equal(invalidation.changedTables.size, 0);
for (const key of ['reps', 'leads', 'appointments', 'activities', 'homes', 'territories']) assert.equal(invalidation[key].length, 0);
assert.equal(invalidation.me, null);
assert.equal(invalidation.session, null);
assert.equal(invalidation.index, 'empty');
assert.equal(app.hidden, true);
assert.equal(invalidation.document.documentElement.dataset.tnAdmin, 'redirect');
// An old admin's delayed response must never reveal its one-time login link to a new account.
const accountsSource = readFileSync(new URL('../tn-files/accounts-admin.js', import.meta.url), 'utf8');
const postSource = accountsSource.slice(accountsSource.indexOf('function accountOwner()'), accountsSource.indexOf('async function createAccount'));
const actSource = accountsSource.slice(accountsSource.indexOf('async function act('), accountsSource.indexOf('async function saveReset'));
function pendingAccountResponse() {
  let releaseBody, markBodyStarted;
  const body = new Promise(resolve => { releaseBody = resolve; });
  const started = new Promise(resolve => { markBodyStarted = resolve; });
  const counts = { renders: 0, refreshes: 0 };
  const account = vm.createContext({
    accountsEpoch: 0, accountsCacheUser: 'old-admin', session: { user: { id: 'old-admin' }, access_token: 'expired' },
    sb: { auth: { getSession: async () => ({ data: { session: { user: { id: 'old-admin' }, access_token: 'fresh-token' } } }) } },
    fetch: async (_url, options) => {
      assert.equal(options.headers.authorization, 'Bearer fresh-token');
      return { ok: true, json: () => { markBodyStarted(); return body; } };
    },
    mutationPending: false, people: [{ id: 'teammate', name: 'Teammate' }], openLink: null, notice: '', detail: null,
    render: () => counts.renders++, refreshPeople: async () => counts.refreshes++, document: {},
  });
  vm.runInContext(`${postSource};${actSource};globalThis.post = post;globalThis.act = act;`, account);
  const switchUser = () => { account.accountsEpoch++; account.accountsCacheUser = 'next-user'; account.session = { user: { id: 'next-user' } }; account.openLink = null; };
  return { account, counts, started, releaseBody, switchUser };
}
const delayedPost = pendingAccountResponse();
const staleResponse = delayedPost.account.post({ action: 'open-as', repId: 'teammate' });
await delayedPost.started;
delayedPost.switchUser(); delayedPost.releaseBody({ url: 'https://secret.example/old-admin-link' });
await assert.rejects(staleResponse, /Account session changed/);
const delayedAction = pendingAccountResponse();
const oldAction = delayedAction.account.act('open', 'teammate');
await delayedAction.started;
delayedAction.switchUser(); delayedAction.releaseBody({ url: 'https://secret.example/old-admin-link' });
await oldAction;
assert.equal(delayedAction.account.openLink, null);
assert.equal(delayedAction.counts.renders, 0);
assert.equal(delayedAction.counts.refreshes, 0);
console.log('Management navigation, auth hydration/cache invalidation, and stale account-response isolation passed.');
