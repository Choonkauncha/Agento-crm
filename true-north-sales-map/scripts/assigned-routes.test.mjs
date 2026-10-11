import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { featureAllowed } from '../lib/features.js';
import {
  canAssignRoutes, clearRouteDraft, mergeAssignedRoutes, readRouteDraft, readStoredRoutes,
  removeAssignedRoute, routeBannerText, routeTeam, upsertAssignedRoute, visibleAssignedRoutes,
  writeRouteDraft, writeStoredRoutes
} from '../lib/assigned-routes.js';

assert.equal(canAssignRoutes('admin'), true);
assert.equal(canAssignRoutes('manager'), true);
assert.equal(canAssignRoutes('owner'), true);
assert.equal(canAssignRoutes('appointment_setter'), false);
assert.equal(canAssignRoutes('salesperson'), false);
assert.equal(featureAllowed([], 'admin', 'routes'), true);
assert.equal(featureAllowed([], 'owner', 'routes'), true);
assert.equal(featureAllowed([], 'manager', 'map'), true);

const team = routeTeam([
  { id: 'b', name: 'Zoe Sales', role: 'salesperson', active: true },
  { id: 'a', name: 'Riley Setter', role: 'appointment_setter', active: true },
  { id: 'c', name: 'Old Admin', role: 'admin', active: true },
  { id: 'd', name: 'Gone', role: 'salesperson', active: false }
]);
assert.deepEqual(team.map((rep) => rep.name), ['Riley Setter', 'Zoe Sales']);
assert.equal(routeBannerText('Riley Setter', { editing: true }), 'Building route for Riley Setter');
assert.equal(routeBannerText('Riley Setter', { editing: false }), 'Route for Riley Setter');

const saved = upsertAssignedRoute([], {
  assigneeId: 'a', createdBy: 'admin', leadIds: ['h1', 'h1', 'h2'], assigneeName: 'Riley Setter'
});
assert.deepEqual(saved[0].lead_ids, ['h1', 'h2']);
const newer = upsertAssignedRoute(saved, { assigneeId: 'a', createdBy: 'admin', leadIds: ['h3'], assigneeName: 'Riley Setter', updatedAt: '2099-01-01T00:00:00.000Z' });
assert.deepEqual(newer[0].lead_ids, ['h3']);
const merged = mergeAssignedRoutes(
  [{ assignee_id: 'a', lead_ids: ['old'], updated_at: '2020-01-01T00:00:00.000Z', assignee_name: 'Riley' }],
  [{ assignee_id: 'a', lead_ids: ['new'], updated_at: '2024-01-01T00:00:00.000Z', assignee_name: 'Riley Setter' }, { assignee_id: 'b', lead_ids: ['z'], created_by: 'admin', updated_at: '2024-01-01T00:00:00.000Z' }]
);
assert.deepEqual(merged.find((row) => row.assignee_id === 'a').lead_ids, ['new']);
assert.equal(visibleAssignedRoutes(merged, { repId: 'a', role: 'appointment_setter' }).length, 1);
assert.equal(visibleAssignedRoutes(merged, { repId: 'a', role: 'admin' }).length, 2);
assert.equal(removeAssignedRoute(merged, 'b').some((row) => row.assignee_id === 'b'), false);

const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key)
};
writeStoredRoutes(storage, merged);
assert.equal(readStoredRoutes(storage).length, 2);
writeRouteDraft(storage, { assigneeId: 'a', name: 'Riley Setter', leadIds: ['h1'], snapshot: ['mine'] });
assert.equal(readRouteDraft(storage).name, 'Riley Setter');
clearRouteDraft(storage);
assert.equal(readRouteDraft(storage), null);

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const access = readFileSync(new URL('../brand/feature-access.js', import.meta.url), 'utf8');
assert.match(html, /id="routeForBtn"[^>]*>Make route for…/);
assert.match(html, /id="routeForBannerText"/);
assert.match(html, /id="routeForDone">Done/);
assert.match(html, /id="routeForCancel">Cancel/);
assert.match(html, /data-route-view|id="assignedRouteList"/);
assert.match(admin, /href="\/\?makeRoute=1">Make route for an employee/);
assert.match(app, /routeBannerText\(state\.routeFor\.name, \{editing\}\)/);
assert.match(app, /function announce\(message, ms=3200\)/);
assert.match(app, /announce\(`Route saved for \$\{person\.name\}/);
assert.match(app, /function deleteAssignedRoute/);
assert.match(app, /function viewAssignedRoute/);
assert.match(app, /from\('assigned_routes'\)/);
assert.match(access, /management&&pending\?'':role/);
assert.match(access, /dataset\.localRoutes/);
const mapFirst = readFileSync(new URL('../brand/map-first.css', import.meta.url), 'utf8');
assert.match(mapFirst, /body\.tn-map-workspace \.routeForBanner p\{color:#fff/);

console.log('Assigned routes: admins build them, employees see only their own, local storage still works');
