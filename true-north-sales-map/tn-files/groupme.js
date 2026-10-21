import { cleanGroupMeUrl } from '../lib/scheduling.js';
// Fetch on each click so admin changes and sign-out take effect immediately.
export async function openGroupMe(summary = '') {
  const popup = window.open('about:blank', '_blank');
  if (popup) popup.opener = null;
  try {
    const cfgResponse = await fetch('/api/config');
    if (!cfgResponse.ok) throw new Error('Could not load scheduling settings.');
    const cfg = await cfgResponse.json();
    const key = `sb-${new URL(cfg.url).hostname.split('.')[0]}-auth-token`;
    const session = JSON.parse(localStorage.getItem(key) || 'null');
    const response = await fetch('/api/field?view=settings', { headers: { authorization: `Bearer ${session?.access_token || ''}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load scheduling settings.');
    const url = cleanGroupMeUrl(data.groupme_url);
    if (!url) throw new Error('An admin needs to set the GroupMe link in Management → Scheduling settings.');
    if (summary && navigator.clipboard?.writeText) await navigator.clipboard.writeText(summary).catch(() => {});
    if (popup) popup.location.replace(url);
    else location.assign(url);
  } catch (error) {
    popup?.close();
    throw error;
  }
}
