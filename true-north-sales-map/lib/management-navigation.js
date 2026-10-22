/** Names and search hints for destinations that actually exist in the signed-in dashboard. */
export const MANAGEMENT_GROUPS = [
  ['daily', 'Daily work'],
  ['people', 'Team & coverage'],
  ['resources', 'Resources'],
  ['settings', 'Settings'],
  ['tools', 'Field tools'],
];
export const MANAGEMENT_DESTINATIONS = {
  overview: { group: 'daily', label: 'Overview', description: 'Upcoming inspections, team activity, and items needing attention.', keywords: 'dashboard today summary home' },
  appointments: { group: 'daily', label: 'Appointments', description: 'Review inspections, sales assignments, and appointment progress.', keywords: 'inspection schedule handoff salesperson unassigned' },
  homeowners: { group: 'daily', label: 'Homeowner requests', description: 'Review new requests and homeowner contact information.', keywords: 'inbound homeowner leads contact property' },
  activity: { group: 'daily', label: 'Activity feed', description: 'Review field actions and inspection handoffs across the team.', keywords: 'audit trail reports history all events status changes' },
  messages: { group: 'daily', label: 'Messages', description: 'Conversations between management and field staff.', keywords: 'inbox chat employee office' },
  shifts: { group: 'daily', label: 'Shifts', description: 'Clock-in activity and shared field locations.', keywords: 'attendance clock time location travel' },
  team: { group: 'people', label: 'Team activity', description: 'See how each teammate is doing in the field.', keywords: 'team roles roster staff employees performance' },
  accounts: { group: 'people', label: 'Accounts', description: 'Manage logins, passwords, access, and archived accounts.', keywords: 'users create employee password reset delete archive' },
  territories: { group: 'people', label: 'Territories', description: 'See who is responsible for each field area.', keywords: 'coverage area neighborhood ownership assignment' },
  files: { group: 'resources', label: 'Documents', description: 'Manage forms, shared documents, receipts, and estimates.', keywords: 'files library paperwork template builder receipts estimates forms' },
  training: { group: 'resources', label: 'Training', description: 'Manage lessons and team training assignments.', keywords: 'lessons video practice learning assignments' },
  scheduling: { group: 'settings', label: 'GroupMe scheduling', description: 'Set the team GroupMe link used to schedule inspections.', keywords: 'group me groupme link chat appointment booking configuration' },
  features: { group: 'settings', label: 'Feature access', description: 'Choose which tools appointment setters and sales reps can use.', keywords: 'permissions roles toggle enable disable access settings' },
  'coach-settings': { group: 'settings', label: 'Voice coach', description: 'Configure the assistant’s coaching goals and company guidance.', keywords: 'gemini ai coach assistant prompt voice settings' },
  map: { group: 'tools', label: 'Field map', description: 'Open addresses, routes, and field navigation.', keywords: 'map route navigation houses canvassing' },
  export: { group: 'tools', label: 'Export leads', description: 'Download the current lead data as a CSV file.', keywords: 'export csv download spreadsheet report' },
};
export function managementDestination(key, fallback = '') {
  return MANAGEMENT_DESTINATIONS[key] || { group: 'resources', label: fallback || 'Management', description: '', keywords: '' };
}
export function managementDestinationMatches(key, query, fallback = '') {
  const terms = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const item = managementDestination(key, fallback);
  const text = `${item.label} ${item.description} ${item.keywords} ${fallback}`.toLowerCase();
  return terms.every(term => text.includes(term));
}
