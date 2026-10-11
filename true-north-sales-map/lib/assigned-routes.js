/** One saved route per employee. Admins assign it; the employee sees it on sign-in. */

export const ASSIGNED_ROUTES_KEY = 'tnrc2:assignedRoutes';
export const ROUTE_DRAFT_KEY = 'tnrc2:routeDraft';
export const LOCAL_ROLE_KEY = 'tnrc2:localRole';
export const LOCAL_USER_KEY = 'tnrc2:localUserId';

const ASSIGN_ROLES = new Set(['admin', 'manager', 'owner']);
const TEAM_ROLES = new Set(['appointment_setter', 'canvasser', 'salesperson', 'manager']);

export function canAssignRoutes(role) {
  return ASSIGN_ROLES.has(role);
}

export function routeTeam(reps) {
  return (reps || [])
    .filter((rep) => rep && rep.active !== false && TEAM_ROLES.has(rep.role) && rep.id)
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export function routeBannerText(name, { editing } = {}) {
  const who = String(name || '').trim() || 'employee';
  return editing ? `Building route for ${who}` : `Route for ${who}`;
}

export function normalizeAssignedRoute(row) {
  if (!row) return null;
  const assigneeId = String(row.assigneeId || row.assignee_id || '').trim();
  if (!assigneeId) return null;
  const leadIds = [];
  const seen = new Set();
  for (const id of row.leadIds || row.lead_ids || []) {
    const text = String(id || '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    leadIds.push(text);
  }
  return {
    assignee_id: assigneeId,
    created_by: String(row.createdBy || row.created_by || '').trim(),
    lead_ids: leadIds,
    assignee_name: String(row.assigneeName || row.assignee_name || '').trim(),
    updated_at: String(row.updatedAt || row.updated_at || '')
  };
}

export function mergeAssignedRoutes(localRows, remoteRows) {
  const byId = new Map();
  for (const row of localRows || []) {
    const next = normalizeAssignedRoute(row);
    if (next) byId.set(next.assignee_id, next);
  }
  for (const row of remoteRows || []) {
    const next = normalizeAssignedRoute(row);
    if (!next) continue;
    const prev = byId.get(next.assignee_id);
    if (!prev || String(next.updated_at) >= String(prev.updated_at || '')) byId.set(next.assignee_id, next);
  }
  return [...byId.values()];
}

export function upsertAssignedRoute(routes, route) {
  const next = normalizeAssignedRoute({ ...route, updated_at: route.updatedAt || route.updated_at || new Date().toISOString() });
  if (!next) return routes || [];
  return mergeAssignedRoutes(routes, [next]);
}

export function removeAssignedRoute(routes, assigneeId) {
  return (routes || []).filter((row) => row.assignee_id !== assigneeId);
}

export function visibleAssignedRoutes(routes, { repId = '', role = '' } = {}) {
  if (canAssignRoutes(role)) return routes || [];
  return (routes || []).filter((row) => row.assignee_id === repId || row.created_by === repId);
}

export function readStoredRoutes(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(ASSIGNED_ROUTES_KEY) || '[]');
    return Array.isArray(parsed) ? mergeAssignedRoutes(parsed, []) : [];
  } catch {
    return [];
  }
}

export function writeStoredRoutes(storage, routes) {
  storage.setItem(ASSIGNED_ROUTES_KEY, JSON.stringify(routes || []));
}

export function readRouteDraft(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(ROUTE_DRAFT_KEY) || 'null');
    if (!parsed?.assigneeId) return null;
    return {
      assigneeId: String(parsed.assigneeId),
      name: String(parsed.name || ''),
      leadIds: normalizeAssignedRoute({ assignee_id: parsed.assigneeId, lead_ids: parsed.leadIds || [] }).lead_ids,
      snapshot: Array.isArray(parsed.snapshot) ? parsed.snapshot.map(String) : []
    };
  } catch {
    return null;
  }
}

export function writeRouteDraft(storage, draft) {
  storage.setItem(ROUTE_DRAFT_KEY, JSON.stringify(draft || null));
}

export function clearRouteDraft(storage) {
  storage.removeItem(ROUTE_DRAFT_KEY);
}
