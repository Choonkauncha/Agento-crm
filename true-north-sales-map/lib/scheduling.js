/** Shared validation and audience rules; never trust a role from browser storage. */
export function cleanGroupMeUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length > 1000) throw new Error('GroupMe link is too long.');
  let url;
  try { url = new URL(text); } catch { throw new Error('Enter a valid HTTPS GroupMe link.'); }
  if (url.protocol !== 'https:' || !['groupme.com', 'www.groupme.com', 'web.groupme.com'].includes(url.hostname) || url.username || url.password || url.port) {
    throw new Error('Use an HTTPS link on groupme.com or web.groupme.com.');
  }
  return url.href;
}
export function appointmentAudience(rep, appointment) {
  if (!rep?.id || !appointment?.id) return false;
  if (['admin', 'manager'].includes(rep.role)) return true;
  if (['appointment_setter', 'canvasser'].includes(rep.role)) return appointment.canvasser_id === rep.id;
  if (rep.role === 'salesperson') return appointment.salesperson_id === rep.id;
  return false;
}
export function messageAudience(status, message) {
  if (!status?.rep?.id || !message?.id) return false;
  if (['admin', 'manager'].includes(status.rep.role)) return true;
  return ['appointment_setter', 'canvasser', 'salesperson'].includes(status.rep.role) && Boolean(status.threadId) && message.thread_id === status.threadId;
}
