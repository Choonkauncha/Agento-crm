---
name: finance-proposals-commissions
primary_domain: Finance
secondary_domains: ['Construction', 'HR']
risk_tier: medium
pack_tier: enterprise
---

# finance-proposals-commissions (Finance Pillar — True North Field OS)

## Taxonomy
- **primary_domain:** Finance
- **secondary_domains:** Construction, HR
- **capabilities:** generate_margin_guarded_estimate, compute_rep_commissions_and_pnl, reconcile_job_ledger
- **mechanisms:** REST gateway `/api/agento`, RBAC role gate, activity audit log
- **verticals:** Roofing & Restoration, Construction Field Ops
- **standards:** RBAC-3-Tier, 35% Gross Margin Guardrail
- **tags:** powerhouse, time-machine, craftsman, finance
- **pack_tier:** enterprise

## Stats
- **Hours saved:** 30–40 hrs/week
- **Prospecting records:** 17,232 properties
- **Target gross margin:** 35% floor

## Operations
- **generate_margin_guarded_estimate:** Compute a roof replacement quote from aerial square footage, pitch, and waste factor while enforcing a 35% gross margin guardrail.
- **compute_rep_commissions_and_pnl:** Calculate contract gross profit, cash collected, receivables, and 1099 sales commission payouts across active jobs.
- **reconcile_job_ledger:** Apply homeowner progress payments and supplier invoice costs to a job ledger and recompute net margin.

## Call flow
1. Validate caller role via `X-Agento-Role` header against operation `requiredRole`.
2. Execute `generate_margin_guarded_estimate` -> `compute_rep_commissions_and_pnl` -> `reconcile_job_ledger` in sequence.
3. Record structured audit entry and return deterministic JSON payload.

## Audit
- **RBAC Role Gate:** Enforces `setter` / `rep` / `admin` permissions with HTTP 403 on violation.
- **Risk Tier:** `low` to `medium` (no external autonomous funds movement).

## Use case
- **title:** Finance Automation in True North Field OS
- **1. Trigger |** Field rep or manager invokes `generate_margin_guarded_estimate` from the route map or Agento workflow.
- **2. Verification |** Gateway validates role and guardrails (`compute_rep_commissions_and_pnl`).
- **3. Completion |** State updates across construction, HR, and finance ledgers (`reconcile_job_ledger`).
