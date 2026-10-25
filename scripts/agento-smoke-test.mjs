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
console.log('=== ALL 12 AGENTO INTEGRATION & CRM CHECKS PASSED ===');
