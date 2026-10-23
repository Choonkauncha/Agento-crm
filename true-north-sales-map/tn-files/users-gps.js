import { bootFiles, signIn } from './store.js';
import { bindSignOut, esc, mountSignIn, revealApp } from './ui.js';
import { easternToday, roleLabel, isAdminRole } from '../lib/field-rules.js';

const root = document.getElementById('gpsApp');
const state = { ctx: null, data: null, selected: '', preview: false, date: easternToday(), query: '', ticket: 0, pending: false, locationUnavailable: false, freshnessSignature: '', ticker: null, poll: null, map: null, layer: null, fitKey: '', authorized: false, detailOpen: false };
const requestedRep = new URLSearchParams(location.search).get('repId');
const stamp = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' }) : 'Unavailable';
const pointTime = point => Date.parse(point?.captured_at || point?.recorded_at || point?.created_at || '');
const finiteCoord = point => point?.lat != null && point?.lng != null && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)) && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180;
const duration = seconds => {
  if (seconds == null || !Number.isFinite(Number(seconds)) || Number(seconds) < 0) return 'Unavailable';
  const s = Math.floor(Number(seconds));
  return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};
function openShift(person) { return (person?.shifts || []).find(shift => !shift.clock_out_at) || person?.openShift || null; }
function liveState(person) {
  if (!openShift(person)) return { label: 'Clocked out · sharing stopped', fresh: false };
  if (state.locationUnavailable) return { label: 'Clocked in · GPS refresh unavailable', fresh: false };
  const point = person.liveLocation;
  const age = Date.now() - pointTime(point);
  if (!finiteCoord(point) || !Number.isFinite(age)) return { label: 'Clocked in · waiting for GPS', fresh: false };
  if (age < 0 || age > 20000 || point.accuracy_m == null || !Number.isFinite(Number(point.accuracy_m)) || Number(point.accuracy_m) < 0 || Number(point.accuracy_m) > 25) return { label: 'Clocked in · GPS update overdue', fresh: false };
  return { label: 'Clocked in · location current', fresh: true };
}
function displayedVisits(person) { return state.data?.preview ? person?.example?.visits || [] : person?.visits || []; }
function destroyMap() { state.map?.remove(); state.map = null; state.layer = null; state.fitKey = ''; }
function clearPrivateData() {
  ++state.ticket; clearInterval(state.poll); clearInterval(state.ticker); state.authorized = false; state.pending = false;
  state.data = null; state.selected = ''; state.preview = false; destroyMap(); root.replaceChildren();
}
async function request(query, retry = true) {
  const { data, error } = await state.ctx.sb.auth.getSession();
  if (error || !data?.session) throw Object.assign(new Error('Sign in to management to view Users GPS.'), { status: 401 });
  const response = await fetch(`/api/field?${query}`, { cache: 'no-store', headers: { authorization: `Bearer ${data.session.access_token}` } });
  if (response.status === 401 && retry) {
    const refreshed = await state.ctx.sb.auth.refreshSession();
    if (!refreshed.error && refreshed.data?.session) return request(query, false);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || 'Could not load Users GPS.'), { status: response.status });
  return payload;
}
function showProblem(message) {
  clearPrivateData(); revealApp(); root.setAttribute('aria-busy', 'false');
  root.innerHTML = `<section class="gpsEmpty"><h1>Users GPS</h1><p>${esc(message)}</p><a class="btn" href="/admin">Back to management</a></section>`;
}
function shell() {
  root.innerHTML = `<div class="gpsHeading"><div><div class="eyebrow">MANAGEMENT / USERS GPS</div><h1>Every user. Every field visit.</h1><p>Review locations shared during clocked-in shifts and estimated time near each house. Admins appear alongside the field team.</p></div><form class="gpsControls" id="gpsDateForm"><label for="gpsDate">Shift date · Eastern time<input type="date" id="gpsDate" required max="${easternToday()}" value="${state.date}"></label><button type="submit" id="gpsRefresh">Refresh</button></form></div><p class="gpsNotice" id="gpsNotice" role="status" aria-live="polite"></p><div class="gpsLayout" id="gpsLayout"><aside class="gpsRoster" aria-label="Users"><div class="gpsRosterHead"><h2>Users</h2><p id="gpsRosterCount"></p><label class="srOnly" for="gpsSearch">Search users</label><input class="gpsSearch" id="gpsSearch" type="search" placeholder="Find a user…" autocomplete="off"></div><div class="gpsPeople" id="gpsPeople"></div></aside><section class="gpsDetail" id="gpsDetail" aria-label="Selected user GPS"><div id="gpsDetailHead"></div><div class="gpsMap" id="gpsMap" role="region" aria-label="House visits and shared location map" hidden></div><div id="gpsMapSummary" class="gpsMapSummary" hidden></div><div id="gpsVisits"></div></section></div>`;
  document.getElementById('gpsDateForm').onsubmit = event => {
    event.preventDefault(); state.date = document.getElementById('gpsDate').value; state.preview = false; load();
  };
  document.getElementById('gpsSearch').addEventListener('input', event => { state.query = event.target.value; renderRoster(); });
  document.getElementById('gpsPeople').addEventListener('click', event => {
    const button = event.target.closest('[data-gps-user]');
    if (!button) return;
    state.selected = button.dataset.gpsUser; state.preview = false; state.detailOpen = true; renderRoster(); load();
  });
  document.getElementById('gpsDetail').addEventListener('click', event => {
    const back = event.target.closest('[data-gps-back]');
    if (back) { state.detailOpen = false; document.getElementById('gpsLayout').classList.remove('hasSelection'); document.querySelector(`[data-gps-user="${state.selected}"]`)?.focus(); return; }
    if (event.target.closest('[data-gps-preview]')) { state.preview = !state.preview; load(); return; }
    const focus = event.target.closest('[data-gps-visit]');
    if (focus) {
      const person = state.data?.people?.find(p => p.rep.id === state.selected);
      const visit = displayedVisits(person)[Number(focus.dataset.gpsVisit)];
      if (finiteCoord(visit) && state.map) { state.map.setView([Number(visit.lat), Number(visit.lng)], 19); document.getElementById('gpsMap').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }
  });
}
function freshnessSignature() { return (state.data?.people || []).map(person => liveState(person).label).join('|'); }
function startTimers() {
  clearInterval(state.poll); clearInterval(state.ticker);
  state.poll = setInterval(() => { if (!document.hidden) load({ quiet: true }); }, 15000);
  state.ticker = setInterval(() => {
    if (!state.authorized || state.pending || document.hidden || !state.data) return;
    if (freshnessSignature() !== state.freshnessSignature) { renderRoster(); renderDetail(); }
  }, 1000);
}
function renderRoster() {
  state.freshnessSignature = freshnessSignature();
  const people = state.data?.people || [];
  document.getElementById('gpsRosterCount').textContent = `${people.length} active ${people.length === 1 ? 'profile' : 'profiles'}, including admins`;
  const shown = people.filter(person => `${person.rep.name} ${roleLabel(person.rep.role)}`.toLowerCase().includes(state.query.toLowerCase().trim()));
  document.getElementById('gpsPeople').innerHTML = shown.map(person => {
    const active = openShift(person), live = liveState(person);
    const initials = String(person.rep.name || '?').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('');
    return `<button type="button" class="gpsPerson" data-gps-user="${esc(person.rep.id)}" aria-pressed="${person.rep.id === state.selected}"><span class="gpsAvatar" aria-hidden="true">${esc(initials)}</span><span><strong>${esc(person.rep.name || 'Unnamed user')}</strong><small>${esc(roleLabel(person.rep.role))}</small><small class="gpsPersonState"><span class="gpsDot${live.fresh ? ' live' : ''}" aria-hidden="true"></span>${active ? 'Clocked in' : 'Clocked out'}</small></span></button>`;
  }).join('') || '<p class="gpsEmpty">No matching users.</p>';
}
function renderDetail({ loading = false } = {}) {
  const person = state.data?.people?.find(p => p.rep.id === state.selected);
  const head = document.getElementById('gpsDetailHead'), visitsRoot = document.getElementById('gpsVisits');
  if (!person) { head.innerHTML = '<div class="gpsEmpty"><h2>Choose a user</h2><p>Select a teammate to review their clocked-in house visits and location.</p></div>'; visitsRoot.replaceChildren(); document.getElementById('gpsMap').hidden = true; return; }
  document.getElementById('gpsLayout').classList.toggle('hasSelection', state.detailOpen);
  if (loading) { head.innerHTML = `<div class="gpsDetailHead"><button type="button" class="gpsBack" data-gps-back>← All users</button><h2>${esc(person.rep.name)}</h2><p role="status">Loading house visits…</p></div>`; visitsRoot.replaceChildren(); document.getElementById('gpsMap').hidden = true; document.getElementById('gpsMapSummary').hidden = true; return; }
  const visits = displayedVisits(person), live = liveState(person), preview = Boolean(state.data.preview);
  const seconds = visits.reduce((total, visit) => total + Math.max(0, Number(visit.duration_seconds) || 0), 0);
  const previewAvailable = person.previewAvailable || state.data.previewRepId === person.rep.id && state.data.previewAvailable;
  head.innerHTML = `<div class="gpsDetailHead"><button type="button" class="gpsBack" data-gps-back>← All users</button><div class="eyebrow">${esc(roleLabel(person.rep.role))}</div><h2>${esc(person.rep.name)}</h2><div class="gpsBadges"><span class="gpsBadge${preview ? ' preview' : live.fresh ? ' live' : ''}">${esc(preview ? 'Example visits' : live.label)}</span>${preview ? '' : '<span class="gpsBadge">Clocked-in records only</span>'}</div><p>${preview ? 'A separate example itinerary using verified addresses. These are not recorded employee visits.' : 'House times are estimates from observed GPS samples, not proof of a door knock or conversation.'}</p>${previewAvailable || preview ? `<button type="button" class="gpsPreviewToggle" data-gps-preview>${preview ? 'Return to recorded visits' : 'View example visits'}</button>` : ''}<div class="gpsStats"><div><b>${visits.length}</b><span>${preview ? 'Example stops' : 'Matched house visits'}</span></div><div><b>${duration(seconds)}</b><span>${preview ? 'Example time at stops' : 'Observed time near houses'}</span></div>${preview ? '' : `<div><b>${(person.shifts || []).length}</b><span>Shifts on selected date</span></div>`}</div></div>${preview ? '<div class="gpsPreviewNotice">Example itinerary · Kept separate from live GPS and recorded shift activity.</div>' : ''}`;
  const emptyMessage = preview ? 'No example visits are available for this date. Choose October 23, 2026 to view the example itinerary.' : 'No confidently matched house visits for this date. Missing or imprecise GPS does not mean the user was inactive.';
  const labels = { completed: 'Visit ended', ongoing: 'At house · last observed', signal_lost: 'GPS gap · time stopped' };
  visitsRoot.innerHTML = `<div class="gpsVisitsHead"><h3>${preview ? 'Example house visits' : 'House visits'}</h3><span>${esc(state.date)} · Eastern time</span></div><div class="gpsVisits">${visits.map((visit, index) => `<article class="gpsVisit"><span class="gpsVisitNumber" aria-hidden="true">${index + 1}</span><div><h4>${esc(visit.address || 'Address unavailable')}</h4><p>${esc(stamp(visit.arrived_at))} → ${esc(stamp(visit.departed_at || visit.last_seen_at))}</p><p>${esc(labels[visit.status] || 'Observed visit')}${visit.source === 'preview' ? ' · Example' : ''}${visit.accuracy_m != null ? ` · GPS ±${esc(Math.round(Number(visit.accuracy_m)))} m` : ''}</p>${finiteCoord(visit) ? `<div class="gpsVisitActions"><button type="button" data-gps-visit="${index}">Show on map</button></div>` : ''}</div><div class="gpsDuration">${esc(duration(visit.duration_seconds))}<small>${preview ? 'Example duration' : 'Estimated'}</small></div></article>`).join('') || `<div class="gpsEmpty">${emptyMessage}</div>`}</div>${!preview && person.gaps?.length ? `<p class="gpsFooterNote"><b>${person.gaps.length} GPS ${person.gaps.length === 1 ? 'gap' : 'gaps'}</b> in this shift history. Time without fresh samples is excluded from house visit estimates.</p>` : ''}<p class="gpsFooterNote">${preview ? 'Example times are not included in recorded employee activity.' : 'Only time supported by location samples is counted. GPS gaps and ambiguous neighboring houses are not treated as confirmed visits. Location sharing stops on clock-out; phone lock and background limits can interrupt updates.'}</p>`;
  renderMap(person, preview);
}
function renderMap(person, preview) {
  const mapNode = document.getElementById('gpsMap'), summary = document.getElementById('gpsMapSummary');
  const visits = displayedVisits(person).filter(finiteCoord);
  const live = !preview && liveState(person).fresh && finiteCoord(person.liveLocation) ? person.liveLocation : null;
  if ((!visits.length && !live) || !globalThis.L) { mapNode.hidden = true; summary.hidden = true; return; }
  mapNode.hidden = false; summary.hidden = false;
  if (!state.map) {
    state.map = L.map(mapNode, { scrollWheelZoom: false }).setView([40.7589, -82.5154], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(state.map);
    state.layer = L.layerGroup().addTo(state.map);
  }
  state.layer.clearLayers();
  const bounds = [];
  for (const visit of visits) {
    const coords = [Number(visit.lat), Number(visit.lng)]; bounds.push(coords);
    L.circleMarker(coords, { radius: 8, color: preview ? '#956b1a' : '#165bc8', weight: 2, fillColor: preview ? '#e9bd59' : '#75aaff', fillOpacity: .9 }).addTo(state.layer).bindPopup(`<strong>${esc(visit.address)}</strong><br>${esc(duration(visit.duration_seconds))}${preview ? ' · Example visit' : ' · Estimated time'}`);
  }
  if (live) {
    const coords = [Number(live.lat), Number(live.lng)], fresh = liveState(person).fresh; bounds.push(coords);
    L.circleMarker(coords, { radius: 10, color: fresh ? '#128357' : '#6c7c91', weight: 3, fillColor: fresh ? '#5bd6a5' : '#a3afbf', fillOpacity: .9 }).addTo(state.layer).bindPopup(`${fresh ? 'Latest shared location' : 'Last known location · update overdue'}<br>${esc(stamp(live.captured_at))}`);
    if (Number.isFinite(Number(live.accuracy_m)) && Number(live.accuracy_m) > 0) L.circle(coords, { radius: Number(live.accuracy_m), weight: 1, color: fresh ? '#128357' : '#6c7c91', fillOpacity: .08 }).addTo(state.layer);
  }
  summary.textContent = preview ? 'Example house locations. No employee GPS is shown in this itinerary.' : live ? `Latest received location: ${stamp(live.captured_at)}${live.accuracy_m != null ? ` · accuracy ±${Math.round(Number(live.accuracy_m))} m` : ''}. ${liveState(person).fresh ? 'Current sample; precision depends on the device.' : 'Update overdue; this is a last known position.'}` : 'Recorded house visit locations. No current shared location is available for this selection.';
  const fitKey = `${state.selected}:${state.date}:${preview}`;
  requestAnimationFrame(() => { if (!state.map) return; state.map.invalidateSize(); if (state.fitKey !== fitKey && bounds.length) { state.map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17 }); state.fitKey = fitKey; } });
}
async function load({ quiet = false } = {}) {
  if (state.pending && quiet || !state.authorized) return;
  const ticket = ++state.ticket; state.pending = true;
  const selected = state.selected, date = state.date, preview = state.preview;
  const params = new URLSearchParams({ view: 'gps', date });
  if (selected) params.set('repId', selected);
  if (preview && selected) params.set('preview', 'true');
  const notice = document.getElementById('gpsNotice'), refresh = document.getElementById('gpsRefresh');
  if (!quiet) { notice.textContent = 'Loading GPS records…'; notice.dataset.error = 'false'; if (selected) renderDetail({ loading: true }); }
  refresh.disabled = true; root.setAttribute('aria-busy', 'true');
  try {
    const data = await request(params);
    if (ticket !== state.ticket) return;
    state.locationUnavailable = false; state.data = data; state.preview = Boolean(data.preview);
    if (state.selected && !data.people?.some(person => person.rep.id === state.selected)) state.selected = '';
    renderRoster(); renderDetail();
    if (!quiet && state.selected) { const title = document.querySelector('#gpsDetailHead h2'); if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); } }
    notice.dataset.error = 'false'; notice.textContent = `Updated ${stamp(new Date().toISOString())} · ${state.preview ? 'Example itinerary' : 'Refreshes every 15 seconds while this page is visible'}`;
  } catch (error) {
    if (ticket !== state.ticket) return;
    if ([401, 403].includes(error.status)) { showProblem(error.message); return; }
    state.locationUnavailable = true;
    notice.dataset.error = 'true'; notice.textContent = `GPS records could not refresh. ${error.message}`;
    if (!quiet) { state.preview = false; state.data = null; destroyMap(); document.getElementById('gpsDetailHead').innerHTML = '<div class="gpsEmpty">GPS records are unavailable. Use Refresh to try again.</div>'; document.getElementById('gpsVisits').replaceChildren(); document.getElementById('gpsMap').hidden = true; document.getElementById('gpsMapSummary').hidden = true; }
    else { renderRoster(); renderDetail(); }
  } finally { if (ticket === state.ticket) { state.pending = false; refresh.disabled = false; root.setAttribute('aria-busy', 'false'); } }
}
async function signedIn() {
  if (!isAdminRole(state.ctx.rep?.role)) { showProblem('Users GPS is restricted to management profiles.'); return; }
  // The API checks the authenticated role again; cached browser roles never grant data access.
  const status = await request(new URLSearchParams({ view: 'status' }));
  if (!status.isAdmin) { showProblem('Users GPS is restricted to management profiles.'); return; }
  state.authorized = true; shell(); revealApp();
  const signOutButton = document.getElementById('gpsSignOut'); signOutButton.hidden = false; bindSignOut(state.ctx, signOutButton);
  state.selected = /^[0-9a-f-]{36}$/i.test(requestedRep || '') ? requestedRep : ''; state.detailOpen = Boolean(state.selected);
  await load();
  startTimers();
}
async function start() {
  try {
    state.ctx = await bootFiles();
    let originalUser = state.ctx.session?.user?.id || null;
    state.ctx.sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || originalUser && session?.user?.id && session.user.id !== originalUser) { clearPrivateData(); location.reload(); }
      if (!originalUser && session?.user?.id) originalUser = session.user.id;
    });
    if (!state.ctx.session) {
      root.setAttribute('aria-busy', 'false'); mountSignIn(root);
      document.getElementById('tnLogin').onsubmit = async event => {
        event.preventDefault(); const button = event.target.querySelector('[type=submit],button'); button.disabled = true;
        try { await signIn(state.ctx, document.getElementById('tnEmail').value, document.getElementById('tnPassword').value); await signedIn(); }
        catch (error) { const message = document.getElementById('tnLoginError'); if (message) message.textContent = error.message; }
        finally { button.disabled = false; }
      };
      return;
    }
    await signedIn();
  } catch (error) { showProblem(error.message || 'Could not open Users GPS.'); }
}
window.addEventListener('pageshow', event => { if (event.persisted && state.authorized) { load(); startTimers(); } });
window.addEventListener('pagehide', () => { ++state.ticket; clearInterval(state.poll); clearInterval(state.ticker); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.authorized) load({ quiet: true }); });
start();
