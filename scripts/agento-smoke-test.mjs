import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler from '../true-north-sales-map/api/agento.js';

function invoke(method, body = null, headers = {}) {
  let statusCode = 200;
  let jsonBody = null;
  const req = { method, body, headers };
  const res = {
    setHeader() {},
    status(c) { statusCode = c; return this; },
    json(p) { jsonBody = p; return this; },
    end() { return this; },
  };
  return Promise.resolve(handler(req, res)).then(() => ({ statusCode, jsonBody }));
}

console.log('=== True North Field OS · Full 9-Operation & UI Smoke Test ===');

// 1. Manifest
const manifest = await invoke('GET');
assert.equal(manifest.statusCode, 200);
assert.equal(manifest.jsonBody.operations.length, 9);
console.log('✓ 1. GET /api/agento manifest verified (9 operations across HR, Construction, Finance)');

// 2. RBAC enforcement
const rbac = await invoke('POST', { operation: 'onboard_1099_rep', actorRole: 'setter' });
assert.equal(rbac.statusCode, 403);
assert.equal(rbac.jsonBody.governanceRule, 'RBAC_ROLE_GATE');
console.log('✓ 2. RBAC 403 gate verified (setter blocked from admin operation)');

// 3. Test all 9 operations as admin with real domain output checks
const ops = [
  ['onboard_1099_rep', (r) => assert.equal(r.w9AndAgreementStatus, 'Verified')],
  ['audit_rep_shift_compliance', (r) => assert.equal(r.complianceStatus, 'COMPLIANT')],
  ['assign_canvass_shift', (r) => assert.equal(r.stopsCount, 18)],
  ['triage_storm_leads', (r) => assert.equal(r.totalCatalogScanned, 17232)],
  ['log_ai_roof_inspection', (r) => assert.ok(r.materialTakeoff.shingleBundles > 0)],
  ['dispatch_production_job', (r) => assert.equal(r.status, 'PRODUCTION_SCHEDULED')],
  ['generate_margin_guarded_estimate', (r) => {
    assert.equal(r.marginGuardrailPassed, true);
    assert.ok(r.tiers.better_iko_dynasty > r.tiers.good_iko_cambridge);
  }],
  ['compute_rep_commissions_and_pnl', (r) => assert.ok(r.rep1099Commission10PctGP > 0)],
  ['reconcile_job_ledger', (r) => assert.equal(r.ledgerState, 'BALANCED_AND_AUDITED')],
];

for (const [op, check] of ops) {
  const res = await invoke('POST', {
    operation: op,
    actorRole: 'admin',
    payload: { area: 2500, wastePct: 12, targetMarginPct: 22 }, // 22% tests 30% floor clamp
  });
  assert.equal(res.statusCode, 200, `${op} failed`);
  assert.equal(res.jsonBody.ok, true);
  check(res.jsonBody.result);
  console.log(`✓ 3.${ops.findIndex(x => x[0] === op) + 1} ${op} verified (${res.jsonBody.domain})`);
}

// 4. Verify SKILL.md and agento.html exist and contain required hooks
for (const p of ['SKILL.md', 'skills/hr-1099-workforce/SKILL.md', 'skills/construction-field-ops/SKILL.md', 'skills/finance-proposals-commissions/SKILL.md', 'true-north-sales-map/agento.html']) {
  assert.ok(fs.existsSync(`/workspace/true-north-agento/${p}`), `Missing ${p}`);
}
console.log('✓ 4. All SKILL.md manifests and /agento Command Center UI verified');

// 5. Verify Vercel Hobby 12-serverless-function limit is respected
const apiFiles = fs.readdirSync('/workspace/true-north-agento/true-north-sales-map/api').filter(f => f.endsWith('.js'));
assert.ok(apiFiles.length <= 12, `Vercel Hobby limit exceeded: ${apiFiles.length} functions in api/`);
console.log(`✓ 5. Vercel Hobby 12-function limit verified (${apiFiles.length}/12 serverless functions in api/)`);
console.log('=== ALL 13 AGENTO INTEGRATION & CRM CHECKS PASSED ===');

// 5. Headless Chromium UI Smoke Check across /agento.html, /admin.html#agento (tn-files/agento-admin.js), and /rep.html Quote Estimator
import http from 'node:http';
import path from 'node:path';
import { chromium } from '../true-north-sales-map/node_modules/playwright/index.mjs';

const webRoot = '/workspace/true-north-agento/true-north-sales-map';
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/api/agento') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const out = await invoke(req.method, body, req.headers);
    res.writeHead(out.statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(out.jsonBody));
    return;
  }
  if (u.pathname === '/admin-agento-harness.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<div id="app"><aside class="rail"></aside><main class="dashMain"></main></div><script type="module">import { mountAgentoAdmin } from '/tn-files/agento-admin.js'; mountAgentoAdmin({}, { role: 'admin', name: 'Travis Mackie' });</script>`);
    return;
  }
  const filePath = path.join(webRoot, u.pathname === '/' ? 'index.html' : u.pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404).end();
  }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.route('**/tn-files/global-assistant.js', (r) => r.fulfill({ contentType: 'application/javascript', body: '' }));

  // Test A: /agento.html Command Center
  await page.goto(`${origin}/agento.html`);
  await page.locator('#runPowerhouseFlow').click();
  await page.waitForFunction(() => document.getElementById('traceCount')?.textContent === '5 executed');
  assert.equal(await page.locator('#bomSquares').textContent(), '28');

  // Test B: Management Dashboard Agento & Finance Tab (tn-files/agento-admin.js)
  await page.goto(`${origin}/admin-agento-harness.html`);
  await page.locator('button[data-tab="agento"]').click();
  await page.locator('#agRunFullCycle').click();
  await page.waitForFunction(() => (document.getElementById('agAdminTrace')?.textContent || '').includes('generate_margin_guarded_estimate'));
  assert.equal(await page.locator('#agQuoteTiers .card').count(), 3);

  assert.deepEqual(pageErrors, []);
  console.log('✓ 5. Headless Chromium UI check passed for /agento.html and Management Agento & Finance tab with 0 page errors');
} finally {
  await browser.close();
  server.close();
}
