/** Isolated UI verification with synthetic data; no production writes or sign-ins. */
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
const root = fileURLToPath(new URL('../', import.meta.url));
const ADMIN = '11111111-1111-4111-8111-111111111111', SETTER = '22222222-2222-4222-8222-222222222222';
let role = 'admin', deny = false;
const gpsRequests = [];
const session = { access_token: 'synthetic-ui-token', user: { id: ADMIN, email: 'gps-ui@example.test' } };
const rep = () => ({ id: ADMIN, user_id: ADMIN, name: 'Preview Admin', role, active: true });
function payload(url) {
  const now = Date.now(), selected = url.searchParams.get('repId');
  const visit = { lead_id: 'HOUSE-UI', address: 'Synthetic House <img src=x onerror=alert(1)>', lat: 40.759, lng: -82.515, arrived_at: new Date(now - 180000).toISOString(), departed_at: new Date(now - 60000).toISOString(), duration_seconds: 120, status: 'completed', source: 'gps', accuracy_m: 8 };
  const people = [
    { rep: rep(), shifts: [{ id: 'SHIFT-UI', rep_id: ADMIN, clock_in_at: new Date(now - 3600000).toISOString(), clock_out_at: null }], points: [], visits: selected === ADMIN ? [visit] : [], gaps: selected === ADMIN ? [{ duration_seconds: 70 }] : [], liveLocation: { lat: 40.759, lng: -82.515, captured_at: new Date(now).toISOString(), accuracy_m: 8 }, previewAvailable: true },
    { rep: { id: SETTER, name: 'Preview Setter', role: 'appointment_setter' }, shifts: [], visits: [], points: [], gaps: [], liveLocation: null },
  ];
  if (url.searchParams.get('preview') === 'true') people[0].example = { label: 'Example itinerary', visits: Array.from({ length: 6 }, (_, i) => ({ ...visit, source: 'preview', address: `Example house ${i + 1}`, lead_id: `EXAMPLE-${i}`, lat: 40.76 + i / 1000 })) };
  return { date: url.searchParams.get('date'), people, selectedRepId: selected, previewAvailable: true, previewRepId: ADMIN, preview: url.searchParams.get('preview') === 'true' };
}
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const filename = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!filename.startsWith(root)) throw Error('Invalid path');
    const body = await readFile(filename);
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' })[path.extname(filename)] || 'application/octet-stream');
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true, args: process.env.PLAYWRIGHT_CHROMIUM_ARGS ? JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS) : ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (['/brand/prefetch.js', '/field-ops.js', '/tn-files/global-assistant.js'].includes(url.pathname)) return route.fulfill({ contentType: 'text/javascript', body: '' });
    if (url.pathname === '/vendor/supabase/supabase.js') return route.fulfill({ contentType: 'text/javascript', body: `export function createClient(){return {auth:{getSession:async()=>({data:{session:${JSON.stringify(session)}}}),refreshSession:async()=>({data:{session:${JSON.stringify(session)}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:${JSON.stringify(rep())}})})}}` });
    if (url.pathname === '/api/config') return route.fulfill({ json: { configured: true, url: 'https://synthetic.example.test', publishableKey: 'public-synthetic' } });
    if (url.pathname === '/api/field') {
      if (url.searchParams.get('view') === 'gps') { gpsRequests.push(url); return route.fulfill(deny ? { status: 403, json: { error: 'Users GPS is for management.' } } : { json: payload(url) }); }
      return route.fulfill({ json: { isAdmin: true, rep: rep(), openShift: null } });
    }
    return route.continue();
  });
  await page.goto(`${origin}/users-gps.html`);
  await page.getByRole('button', { name: /Preview Admin/ }).waitFor();
  assert.equal(await page.locator('.gpsVisit').count(), 0, 'roster does not pretend unloaded details are visits');
  await page.getByRole('button', { name: /Preview Admin/ }).click();
  await page.locator('.gpsVisit').waitFor();
  assert.equal(gpsRequests.at(-1).searchParams.get('repId'), ADMIN);
  assert.match(await page.locator('.gpsVisit').innerText(), /2m 0s/);
  assert.equal(await page.locator('.gpsVisit img').count(), 0, 'addresses are escaped');
  assert.match(await page.locator('#gpsDetail').innerText(), /1 GPS gap/);
  await page.getByRole('button', { name: 'View example visits' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.gpsVisit').length === 6);
  assert.match(await page.locator('.gpsPreviewNotice').innerText(), /Example itinerary/);
  assert.equal(gpsRequests.at(-1).searchParams.get('preview'), 'true');
  assert.equal(await page.locator('.gpsVisit').filter({ hasText: 'Synthetic House' }).count(), 0, 'recorded visits and examples remain separate');
  await page.getByRole('button', { name: 'Return to recorded visits' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.gpsVisit').length === 1);
  assert.equal(gpsRequests.at(-1).searchParams.has('preview'), false);
  await mkdir(path.join(root, '.ui-artifacts'), { recursive: true });
  await page.screenshot({ path: path.join(root, '.ui-artifacts/users-gps-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'All users', exact: false }).click();
  assert.equal(await page.locator('.gpsRoster').isVisible(), true);
  await Promise.all([page.waitForResponse(r => r.url().includes('/api/field?view=gps')), page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))]);
  assert.equal(await page.locator('.gpsRoster').isVisible(), true, 'refresh preserves mobile back navigation');
  await page.getByRole('button', { name: /Preview Setter/ }).click();
  await page.getByText('Clocked out · sharing stopped', { exact: true }).waitFor();
  assert.equal(await page.locator('#gpsMap').isVisible(), false, 'no live position shown while clocked out');
  await page.screenshot({ path: path.join(root, '.ui-artifacts/users-gps-mobile.png'), fullPage: true });
  deny = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByText('Users GPS is for management.', { exact: true }).waitFor();
  assert.equal(await page.locator('.gpsPerson,.gpsMap,.gpsVisit').count(), 0, 'authorization failures clear all private views');
  deny = false; role = 'appointment_setter';
  await page.reload();
  await page.getByText('Users GPS is restricted to management profiles.', { exact: true }).waitFor();
  assert.equal(await page.locator('.gpsPerson').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Users GPS browser: roster, admin detail, address escaping, examples, map, mobile navigation, clock-out and denied access passed.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
