import { atlasIcon } from '../brand/atlas-icons.js';
import { MANAGEMENT_GROUPS, managementDestination, managementDestinationMatches } from '../lib/management-navigation.js';

/** Organize the existing authorized controls; their click and save handlers stay intact. */
export function mountManagementNavigation(root = document) {
  const shell = root.querySelector('#app.dashboardShell');
  const rail = shell?.querySelector('.rail');
  const main = shell?.querySelector('.dashMain');
  if (!rail || !main || rail.dataset.managementReady) return;
  rail.dataset.managementReady = 'true';
  rail.setAttribute('aria-label', 'Management sections');
  const filter = root.querySelector('#managementSectionSearch');
  const reset = root.querySelector('#managementSearchReset');
  const empty = root.querySelector('#managementNavEmpty');
  const toggle = root.querySelector('#managementSectionsToggle');
  const close = root.querySelector('#managementNavClose');
  const scrim = root.querySelector('#managementNavScrim');
  const current = root.querySelector('#managementCurrentSection');
  const description = root.querySelector('#managementCurrentDescription');
  const content = rail.querySelector('#managementSections');
  const queryStatus = rail.querySelector('#managementSearchStatus');
  if (!content || !scrim) return;
  const narrow = matchMedia('(max-width: 1100px)');
  const groups = new Map();
  const unavailable = new WeakSet();
  for (const [key, label] of MANAGEMENT_GROUPS) {
    const group = document.createElement('div');
    group.className = 'managementNavGroup';
    group.dataset.managementGroup = key;
    const heading = document.createElement('h2');
    heading.textContent = label;
    heading.className = 'managementNavLabel';
    const list = document.createElement('div');
    list.className = 'managementNavItems';
    group.append(heading, list);
    content.append(group);
    groups.set(key, { group, list });
  }
  const keys = node => node.dataset.tab || node.dataset.managementLink || ({ openMessages: 'messages', openMap: 'map', exportCsv: 'export' })[node.id] || (node.matches('a[href="/shifts.html"]') ? 'shifts' : node.matches('a[href="/users-gps.html"]') ? 'users-gps' : '');
  const hidden = (node, value) => { if (node.hidden !== value) node.hidden = value; };
  function controls() { return [...rail.querySelectorAll('[data-tab], #openMessages, #openMap, #exportCsv, [data-management-link], a.railLink')]; }
  function organize() {
    for (const node of controls()) {
      const key = keys(node), item = managementDestination(key, node.textContent.trim());
      const target = groups.get(item.group)?.list;
      if (!target) continue;
      if (node.parentElement !== target) target.append(node);
      if (!node.dataset.managementKey) {
        if (node.hidden || node.classList.contains('hidden')) unavailable.add(node);
        node.dataset.managementKey = key;
        node.title = item.description;
        if (node.tagName === 'BUTTON') node.type = 'button';
        const label = document.createElement('span');
        label.className = 'managementNavText';
        label.textContent = item.label;
        node.replaceChildren();
        const icon = document.createElement('span');
        icon.className = 'managementNavIcon';
        const iconKey = { messages: 'activity', 'users-gps': 'map', map: 'map', export: 'files', features: 'accounts', scheduling: 'appointments', 'coach-settings': 'training', 'book-inspection': 'appointments', 'make-route': 'territories', forms: 'files', photos: 'photos', 'my-training': 'training', account: 'accounts', 'sign-out': 'arrow' }[key] || key;
        icon.innerHTML = atlasIcon(iconKey);
        node.append(icon, label);
      }
    }
    applyFilter();
    syncCurrent();
  }
  function applyFilter() {
    const query = filter?.value || '';
    let count = 0;
    for (const node of controls()) {
      const matches = !unavailable.has(node) && !node.classList.contains('hidden') && managementDestinationMatches(keys(node), query, node.textContent);
      hidden(node, !matches);
      if (matches) count++;
    }
    for (const { group, list } of groups.values()) hidden(group, ![...list.children].some(node => !node.hidden));
    hidden(empty, count !== 0);
    if (reset) hidden(reset, !query);
    if (queryStatus) {
      const label = query ? `${count} matching ${count === 1 ? 'section' : 'sections'}` : '';
      if (queryStatus.textContent !== label) queryStatus.textContent = label;
    }
  }
  function syncCurrent() {
    const active = controls().find(node => node.dataset.tab && node.classList.contains('active'));
    const item = managementDestination(active?.dataset.tab || 'overview');
    if (current && current.textContent !== item.label) current.textContent = item.label;
    if (description && description.textContent !== item.description) description.textContent = item.description;
    for (const node of controls()) {
      if (node === active) {
        if (node.getAttribute('aria-current') !== 'page') node.setAttribute('aria-current', 'page');
      } else if (node.hasAttribute('aria-current')) node.removeAttribute('aria-current');
    }
    if (toggle) toggle.setAttribute('aria-label', `Management sections. Current section: ${item.label}`);
  }
  function setOpen(open, returnFocus = false) {
    const visible = Boolean(open && narrow.matches);
    shell.classList.toggle('managementNavOpen', visible);
    document.body.classList.toggle('managementNavModal', visible);
    main.inert = visible;
    toggle?.setAttribute('aria-expanded', String(visible));
    hidden(scrim, !visible);
    if (visible) {
      rail.setAttribute('role', 'dialog');
      rail.setAttribute('aria-modal', 'true');
      filter?.focus();
    } else {
      rail.removeAttribute('role');
      rail.removeAttribute('aria-modal');
      if (returnFocus && narrow.matches) toggle?.focus();
    }
  }
  filter?.addEventListener('input', applyFilter);
  reset?.addEventListener('click', () => { filter.value = ''; applyFilter(); filter.focus(); });
  filter?.addEventListener('keydown', event => {
    if (event.key === 'Escape' && filter.value) {
      event.preventDefault(); event.stopPropagation(); filter.value = ''; applyFilter();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault(); controls().find(node => !node.hidden)?.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault(); controls().find(node => !node.hidden)?.click();
    }
  });
  toggle?.addEventListener('click', () => setOpen(!shell.classList.contains('managementNavOpen')));
  close?.addEventListener('click', () => setOpen(false, true));
  scrim?.addEventListener('click', () => setOpen(false, true));
  rail.addEventListener('keydown', event => {
    if (!shell.classList.contains('managementNavOpen')) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); }
    if (event.key === 'Tab') {
      const items = [...rail.querySelectorAll('button, input, a[href]')].filter(node => !node.disabled && !node.closest('[hidden]') && node.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  rail.addEventListener('click', event => {
    if (!event.target.closest('[data-tab], #openMessages, #openMap, #exportCsv, [data-management-link], a.railLink')) return;
    if (filter) filter.value = '';
    applyFilter();
    if (narrow.matches) setOpen(false, true);
    requestAnimationFrame(syncCurrent);
  });
  function syncAvailability() {
    const unavailable = shell.hidden || shell.classList.contains('hidden');
    if (toggle) toggle.hidden = unavailable;
    if (unavailable) setOpen(false);
  }
  new MutationObserver(syncAvailability).observe(shell, { attributes: true, attributeFilter: ['class', 'hidden'] });
  syncAvailability();
  const onResize = () => setOpen(false);
  narrow.addEventListener('change', onResize);
  document.addEventListener('tn-admin-view', () => requestAnimationFrame(syncCurrent));
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; organize(); });
  });
  observer.observe(rail, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  organize();
}
mountManagementNavigation();
