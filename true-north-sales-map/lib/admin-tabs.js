const ADMIN_TABS = ['agento', 'overview', 'team', 'appointments', 'homeowners', 'activity', 'territories', 'files', 'accounts', 'training', 'features', 'coach-settings', 'scheduling'];

/** Map a /admin hash to a dashboard tab. Messages and the form library are not rail tabs. */
export function adminHashTarget(hash) {
  let raw;
  try { raw = decodeURIComponent(String(hash || '').replace(/^#/, '')).split('&')[0]; }
  catch { return { tab: '', messages: false, builder: false }; }
  if (!raw) return { tab: '', messages: false, builder: false };
  if (raw === 'messages') return { tab: 'overview', messages: true, builder: false };
  if (['builder', 'library', 'receipts', 'estimates'].includes(raw)) return { tab: 'files', messages: false, builder: true };
  if (raw.startsWith('property=')) return { tab: 'files', messages: false, builder: false };
  if (ADMIN_TABS.includes(raw)) return { tab: raw, messages: false, builder: false };
  return { tab: '', messages: false, builder: false };
}

/** Bind dashboard tabs without replacing a handler another module already owns. */
export function bindAdminTabs(root, showTab) {
  root.querySelectorAll('[data-tab]').forEach((button) => {
    if (button.dataset.tnTabBound) return;
    button.dataset.tnTabBound = '1';
    button.addEventListener('click', () => showTab(button.dataset.tab));
  });
  root.querySelectorAll('[data-goto]').forEach((button) => {
    if (button.dataset.tnTabBound) return;
    button.dataset.tnTabBound = '1';
    button.addEventListener('click', () => showTab(button.dataset.goto));
  });
}

/** Activate only a mounted destination, keeping browser history and accessible state together. */
export function activateAdminTab(root, tab, { historyMode = 'push' } = {}) {
  const section = root.getElementById(`tab-${tab}`);
  if (!section) return false;
  const view = root.defaultView || window;
  const changed = section.classList.contains('hidden');
  root.querySelectorAll('[data-tab]').forEach(button => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  root.querySelectorAll('main section[id^=tab-]').forEach(item => item.classList.toggle('hidden', item !== section));
  if (changed) view.scrollTo({ top: 0, behavior: 'instant' });
  if (historyMode !== 'none' && view.location.hash !== `#${tab}`) {
    view.history[historyMode === 'replace' ? 'replaceState' : 'pushState'](null, '', `#${tab}`);
  }
  root.dispatchEvent(new view.CustomEvent('tn-admin-view', { detail: tab }));
  return true;
}

/** Resolve nested document destinations without allowing malformed URL escapes to break the app. */
export function filesHashTarget(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  if (!raw || raw === 'files') return { view: 'documents', propertyKey: '' };
  if (raw === 'builder') return { view: 'builder', propertyKey: '' };
  if (['library', 'receipts', 'estimates'].includes(raw)) return { view: 'library', propertyKey: '' };
  if (raw.startsWith('property=')) {
    try {
      const propertyKey = decodeURIComponent(raw.slice('property='.length));
      return { view: propertyKey ? 'property' : 'documents', propertyKey };
    } catch { return { view: 'documents', propertyKey: '' }; }
  }
  return null;
}
