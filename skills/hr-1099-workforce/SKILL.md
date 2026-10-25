---
name: hr-1099-workforce
primary_domain: HR
secondary_domains: ['Construction', 'Finance']
risk_tier: medium
pack_tier: enterprise
---

# hr-1099-workforce (HR Pillar — True North Field OS)

## Taxonomy
- **primary_domain:** HR
- **secondary_domains:** Construction, Finance
- **capabilities:** onboard_1099_rep, audit_rep_shift_compliance, assign_canvass_shift
- **mechanisms:** REST gateway `/api/agento`, RBAC role gate, activity audit log
- **verticals:** Roofing & Restoration, Construction Field Ops
- **standards:** RBAC-3-Tier, 35% Gross Margin Guardrail
- **tags:** powerhouse, time-machine, craftsman, hr
- **pack_tier:** enterprise

## Stats
- **Hours saved:** 30–40 hrs/week
- **Prospecting records:** 17,232 properties
- **Target gross margin:** 35% floor

## Operations
- **onboard_1099_rep:** Provision a 1099 Sales Rep or Appointment Setter with role-gated portal credentials, territory bounds, and GroupMe routing.
- **audit_rep_shift_compliance:** Verify GPS shift breadcrumbs, door-knock visit cadence, and SPEAX AI coaching completion across the 5-person field team.
- **assign_canvass_shift:** Dispatch a multi-stop Knox County / Mount Vernon storm canvass route to an active field rep or setter.

## Call flow
1. Validate caller role via `X-Agento-Role` header against operation `requiredRole`.
2. Execute `onboard_1099_rep` -> `audit_rep_shift_compliance` -> `assign_canvass_shift` in sequence.
3. Record structured audit entry and return deterministic JSON payload.

## Audit
- **RBAC Role Gate:** Enforces `setter` / `rep` / `admin` permissions with HTTP 403 on violation.
- **Risk Tier:** `low` to `medium` (no external autonomous funds movement).

## Use case
- **title:** HR Automation in True North Field OS
- **1. Trigger |** Field rep or manager invokes `onboard_1099_rep` from the route map or Agento workflow.
- **2. Verification |** Gateway validates role and guardrails (`audit_rep_shift_compliance`).
- **3. Completion |** State updates across construction, HR, and finance ledgers (`assign_canvass_shift`).
