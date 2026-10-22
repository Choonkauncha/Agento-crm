import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MANAGEMENT_GROUPS, MANAGEMENT_DESTINATIONS, managementDestination, managementDestinationMatches } from '../lib/management-navigation.js';

// People search by the job they need to do, including terms absent from the label.
for (const [query, expected] of [
  ['reset password', 'accounts'],
  ['GroupMe link', 'scheduling'],
  ['group me', 'scheduling'],
  ['inspection unassigned', 'appointments'],
  ['reports', 'activity'],
  ['download csv', 'export'],
  ['permissions', 'features'],
]) {
  assert.equal(managementDestinationMatches(expected, query), true, query);
}
assert.equal(managementDestinationMatches('accounts', '   RESET   PASSWORD  '), true);
assert.equal(managementDestinationMatches('accounts', 'reset homeowner'), false);
assert.equal(managementDestinationMatches('overview', 'no-such-destination'), false);
assert.equal(managementDestinationMatches('overview', ''), true);
assert.equal(managementDestinationMatches('future-tool', 'new feature', 'New feature'), true);
assert.equal(managementDestination('future-tool', 'New feature').label, 'New feature');

const html = readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const rail = html.slice(html.indexOf('<aside id="managementRail"'), html.indexOf('</aside>'));
for (const match of rail.matchAll(/data-tab="([^"]+)"/g)) {
  assert.ok(MANAGEMENT_DESTINATIONS[match[1]], `A current destination needs searchable navigation: ${match[1]}`);
}
const groups = new Set(MANAGEMENT_GROUPS.map(([key]) => key));
for (const [key, destination] of Object.entries(MANAGEMENT_DESTINATIONS)) {
  assert.ok(groups.has(destination.group), key);
}
console.log('Management destination discovery and search passed.');
