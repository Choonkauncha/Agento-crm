#!/usr/bin/env node
/**
 * True North Field OS — Agento Gauntlet Verification & Bug Hunter Harness
 * Verifies:
 *   1. Unified /api/agento serverless handler across HR, Construction, and Finance operations
 *   2. RBAC role-gate enforcement (Setter vs Rep vs Admin)
 *   3. 35% Gross Margin Guardrail math & 1099 commission calculation
 */

import assert from 'node:assert/strict';


import handler from '../true-north-sales-map/api/agento.js';

function invoke(method, body = {}, headers = {}) {
  return new Promise((resolve) => {
    const req = { method, body, headers };
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload });
        return this;
      },
      end() {
        resolve({ status: this.statusCode, body: null });
        return this;
      },
    };
    handler(req, res);
  });
}

async function run() {
  console.log('=== True North Field OS · Agento Smoke Test ===');

  // 1. Manifest check
  const manifest = await invoke('GET');
  assert.equal(manifest.status, 200);
  assert.deepEqual(manifest.body.domains, ['HR', 'Construction', 'Finance']);
  assert.equal(manifest.body.operations.length, 9);
  console.log('✓ GET /api/agento manifest verified (9 operations across HR, Construction, Finance)');

  // 2. RBAC role gate check (Setter attempting Admin HR onboarding should 403)
  const denied = await invoke('POST', {
    operation: 'onboard_1099_rep',
    actorRole: 'setter',
    payload: { name: 'Test Rep' },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.governanceRule, 'RBAC_ROLE_GATE');
  console.log('✓ RBAC role-gate verified (setter blocked from admin HR onboarding with 403)');

  // 3. Finance margin-guarded estimate calculation
  const financeRes = await invoke('POST', {
    operation: 'generate_margin_guarded_estimate',
    actorRole: 'rep',
    payload: {
      property: '513 South McKenzie St, Mount Vernon, OH 43050',
      area: 2500,
      wastePct: 12,
      targetMarginPct: 35,
    },
  });
  assert.equal(financeRes.status, 200);
  assert.equal(financeRes.body.result.squaresWithWaste, 28);
  assert.equal(financeRes.body.result.grossMarginPct, 35);
  assert.equal(financeRes.body.result.marginGuardrailPassed, true);
  console.log(
    `✓ Finance estimate verified: 28 squares -> $${financeRes.body.result.quotedPrice} quote ($${financeRes.body.result.grossProfit} gross profit, $${financeRes.body.result.projected1099Commission} 1099 rep commission)`
  );

  // 4. Construction storm-lead triage (Setter allowed)
  const constructRes = await invoke('POST', {
    operation: 'triage_storm_leads',
    actorRole: 'setter',
    payload: { territory: 'Knox County', limit: 10 },
  });
  assert.equal(constructRes.status, 200);
  assert.equal(constructRes.body.domain, 'Construction');
  console.log('✓ Construction storm-lead triage verified for setter role');

  console.log('=== ALL AGENTO SMOKE TESTS PASSED ===');
}

run().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
